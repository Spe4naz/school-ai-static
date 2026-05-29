require('dotenv').config();

const REQUIRED_ENV = ['JWT_SECRET'];
if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'ci') {
  REQUIRED_ENV.push('DATABASE_URL');
}
const MISSING_ENV = REQUIRED_ENV.filter(k => !process.env[k]);
if (MISSING_ENV.length > 0) {
  console.error(`FATAL: Missing required environment variables: ${MISSING_ENV.join(', ')}`);
  process.exit(1);
}

const RECOMMENDED_ENV = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER'];
const MISSING_REC = RECOMMENDED_ENV.filter(k => !process.env[k]);
if (MISSING_REC.length > 0 && process.env.NODE_ENV === 'production') {
  console.warn(`WARNING: Missing recommended env vars in production: ${MISSING_REC.join(', ')}`);
}

const DEFAULT_SECRETS = ['dev_secret_key_change_in_production', 'change_this_in_production_please_12345', 'change_this_to_a_secure_random_string_please'];
if (DEFAULT_SECRETS.includes(process.env.JWT_SECRET)) {
  console.error('FATAL: JWT_SECRET is set to a known default value. Change it immediately.');
  process.exit(1);
}

if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32 && process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'ci') {
  console.error('FATAL: JWT_SECRET must be at least 32 characters long.');
  process.exit(1);
}

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const cron = require('node-cron');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');

const db = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimit');
const { backupService } = require('./config/container');

const authRoutes = require('./routes/auth');
const gradeRoutes = require('./routes/grades');
const scheduleRoutes = require('./routes/schedule');
const { router: notificationRoutes, sseClients } = require('./routes/notifications');
const adminRoutes = require('./routes/admin');
const chatRoutes = require('./routes/chat');
const reportRoutes = require('./routes/reports');
const profileRoutes = require('./routes/profile');
const homeworkRoutes = require('./routes/homework');
const announcementRoutes = require('./routes/announcements');

const app = express();
const PORT = process.env.PORT || 3000;
let httpServer = null;

app.set('trust proxy', 1);
app.use(compression());
app.use(cookieParser());

// CSP nonce middleware
app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
});

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.cspNonce}'`, 'https://cdn.jsdelivr.net', 'https://unpkg.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com', 'https://cdn.jsdelivr.net', 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'data:', 'https://unpkg.com', 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
}));
app.use(express.json({ limit: '1mb' }));

// HTML cache (loaded once at startup)
const htmlCache = {};
const fs = require('fs');
const htmlFiles = ['index.html', 'dashboard.html', 'register.html', 'reset-password.html', 'admin-panel.html'];
htmlFiles.forEach(file => {
  const filePath = path.join(__dirname, 'public', file);
  if (fs.existsSync(filePath)) {
    htmlCache[file] = fs.readFileSync(filePath, 'utf8');
  }
});

function serveHtml(filename, res) {
  let html = htmlCache[filename];
  if (!html) return res.status(404).send('Not found');
  const nonce = res.locals.cspNonce;
  html = html.replace(/<script>/g, `<script nonce="${nonce}">`);
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
}

// HTML routes BEFORE static middleware to prevent bypass
app.get('/', (req, res) => serveHtml('index.html', res));
app.get('/dashboard.html', (req, res) => serveHtml('dashboard.html', res));
app.get('/register.html', (req, res) => serveHtml('register.html', res));
app.get('/reset-password.html', (req, res) => serveHtml('reset-password.html', res));

// Admin panel - SPA with server-side auth check
app.get('/admin-panel', (req, res) => {
  const jwt = require('jsonwebtoken');
  const config = require('./config/auth');
  const token = req.cookies?.token;
  if (!token) {
    return res.redirect('/');
  }
  try {
    const decoded = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'], issuer: 'school-ai' });
    if (decoded.role !== 'admin') {
      return res.redirect('/');
    }
  } catch {
    return res.redirect('/');
  }
  serveHtml('admin-panel.html', res);
});

// Static files AFTER HTML routes — no extensions: ['html'] to prevent bypass
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1y',
  immutable: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  },
}));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', apiLimiter);

app.use('/api', authRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api', profileRoutes);
app.use('/api', adminRoutes);
app.use('/api/homework', homeworkRoutes);
app.use('/api/announcements', announcementRoutes);

// Make SSE clients available to notification service
const { notificationService } = require('./config/container');
notificationService.setSseClients(sseClients);

app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Маршрут не найден', code: 'NOT_FOUND' });
});

app.use(errorHandler);

async function startApp() {
  await db.init();
  await backupService.init();

  if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'ci') {
    cron.schedule('0 * * * *', async () => {
      try {
        await backupService.create();
      } catch (err) {
        console.error('Backup error:', err);
      }
    });
  }

  const server = app.listen(PORT, () => {
    console.log(`School AI: http://localhost:${PORT}`);
    console.log(`Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Backups: ${backupService.backupDir}`);
  });

  httpServer = server;
  return server;
}

async function shutdown(signal) {
  console.log(`Received ${signal}, shutting down gracefully...`);
  // Close SSE connections
  try {
    for (const [, clients] of sseClients) {
      clients.forEach((c) => {
        try { c.write('data: {"type":"shutdown"}\n\n'); } catch (_) { /* ignore */ }
        try { c.end(); } catch (_) { /* ignore */ }
      });
    }
  } catch (err) {
    console.error('Error closing SSE connections:', err);
  }
  try {
    if (httpServer) {
      await new Promise((resolve) => httpServer.close(resolve));
    }
  } catch (err) {
    console.error('Error closing HTTP server:', err);
  }
  try {
    await db.close();
  } catch (err) {
    console.error('Error closing database:', err);
  }
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  shutdown('uncaughtException');
});

if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'ci') {
  startApp().catch(console.error);
}

module.exports = app;
