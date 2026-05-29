// routes/setup.js — First-run setup wizard
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { z } = require('zod');

const envPath = path.join(__dirname, '..', '.env');
const credsPath = path.join(__dirname, '..', '.setup-creds.json');

// Sanitize value for .env — reject newlines, quotes, backticks
function sanitizeEnvValue(val) {
  if (typeof val !== 'string') return String(val);
  return val.replace(/[\n\r"'`]/g, '').trim();
}

function isSetupComplete() {
  try {
    // Check if creds file exists (first boot pending)
    if (fs.existsSync(credsPath)) return false;
    const env = fs.readFileSync(envPath, 'utf8');
    const hasDomain = /^DOMAIN=.+$/m.test(env) && !env.includes('DOMAIN=example.com');
    const hasJwt = /^JWT_SECRET=.+$/m.test(env) && !env.includes('CHANGE_ME') && !env.includes('CHANGE_TO');
    const hasDb = /^DATABASE_URL=.+$/m.test(env) && !/^DATABASE_URL=\s*$/m.test(env);
    return hasDomain && hasJwt && hasDb;
  } catch {
    return false;
  }
}

// Delete setup credentials file after first successful admin login
function deleteSetupCredentials() {
  try {
    if (fs.existsSync(credsPath)) {
      fs.unlinkSync(credsPath);
      console.log('[setup] Credentials file deleted after first login');
    }
  } catch (e) {
    console.error('[setup] Failed to delete credentials file:', e.message);
  }
}

function readEnv() {
  try {
    return fs.readFileSync(envPath, 'utf8');
  } catch {
    return '';
  }
}

function writeEnv(updates) {
  let env = readEnv();
  for (const [key, value] of Object.entries(updates)) {
    const safeValue = sanitizeEnvValue(value);
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(env)) {
      env = env.replace(regex, `${key}=${safeValue}`);
    } else {
      env += `\n${key}=${safeValue}`;
    }
  }
  fs.writeFileSync(envPath, env.trim() + '\n', 'utf8');
}

// Check if setup is needed
router.get('/status', (req, res) => {
  res.json({ complete: isSetupComplete() });
});

// Get current config (masked)
router.get('/config', (req, res) => {
  if (isSetupComplete()) {
    return res.status(403).json({ error: 'Setup already complete' });
  }
  const env = readEnv();
  const get = (key) => {
    const match = env.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return match ? match[1].trim() : '';
  };
  res.json({
    domain: get('DOMAIN'),
    port: get('PORT') || '3000',
    nodeEnv: get('NODE_ENV') || 'development',
  });
});

// Apply setup configuration
const setupSchema = z.object({
  domain: z
    .string()
    .min(1, 'Домен обязателен')
    .max(253)
    .regex(/^[a-zA-Z0-9.-]+$/, 'Домен содержит недопустимые символы'),
  port: z.string().regex(/^\d+$/, 'Порт должен быть числом').default('3000'),
  adminEmail: z.string().email('Неверный email'),
  adminPassword: z
    .string()
    .min(8, 'Минимум 8 символов')
    .regex(/[a-z]/, 'Хотя бы одна строчная буква')
    .regex(/[A-Z]/, 'Хотя бы одна заглавная буква')
    .regex(/[0-9]/, 'Хотя бы одна цифра'),
  adminName: z.string().min(1, 'Имя обязательно').max(100),
});

router.post('/apply', (req, res) => {
  if (isSetupComplete()) {
    return res.status(403).json({ error: 'Setup already complete' });
  }

  const result = setupSchema.safeParse(req.body);
  if (!result.success) {
    const first = result.error.issues[0];
    return res.status(400).json({ error: first.message });
  }

  const { domain, port, adminEmail, adminPassword, adminName } = result.data;

  const jwtSecret = crypto.randomBytes(32).toString('hex');
  const dbPassword = crypto.randomBytes(16).toString('hex');
  const frontendUrl = `https://${domain}`;

  writeEnv({
    DOMAIN: domain,
    NODE_ENV: 'production',
    PORT: port,
    FRONTEND_URL: frontendUrl,
    JWT_SECRET: jwtSecret,
    DATABASE_URL: `postgresql://school:${dbPassword}@db:5432/school`,
    POSTGRES_USER: 'school',
    POSTGRES_PASSWORD: dbPassword,
    POSTGRES_DB: 'school',
    BACKUP_DIR: './backups',
    BACKUP_RETENTION_DAYS: '7',
  });

  // Store admin credentials temporarily (deleted after first login)
  fs.writeFileSync(
    credsPath,
    JSON.stringify({
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    }),
    'utf8',
  );

  res.json({
    success: true,
    message: 'Конфигурация применена. Перезапустите сервер.',
    domain,
    frontendUrl,
  });
});

// Generate strong JWT secret
router.get('/generate-secret', (req, res) => {
  res.json({ secret: crypto.randomBytes(32).toString('hex') });
});

module.exports = router;
module.exports.isSetupComplete = isSetupComplete;
module.exports.deleteSetupCredentials = deleteSetupCredentials;
