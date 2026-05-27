require('dotenv').config();

const REQUIRED_ENV = ['JWT_SECRET'];
const MISSING_ENV = REQUIRED_ENV.filter(k => !process.env[k]);
if (MISSING_ENV.length > 0) {
  console.error(`FATAL: Missing required environment variables: ${MISSING_ENV.join(', ')}`);
  process.exit(1);
}

const DEFAULT_SECRETS = ['dev_secret_key_change_in_production', 'change_this_in_production_please_12345'];
if (DEFAULT_SECRETS.includes(process.env.JWT_SECRET)) {
  console.error('FATAL: JWT_SECRET is set to a known default value. Change it immediately.');
  process.exit(1);
}

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cron = require('node-cron');
const cookieParser = require('cookie-parser');

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
app.use(cookieParser());

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://unpkg.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com', 'https://cdn.jsdelivr.net', 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'data:', 'https://unpkg.com', 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// Admin panel - SPA (auth handled client-side)
app.get('/admin-panel', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-panel.html'));
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
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
