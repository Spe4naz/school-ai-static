// routes/setup.js — First-run setup wizard
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { z } = require('zod');

const envPath = path.join(__dirname, '..', '.env');

function isSetupComplete() {
  try {
    const env = fs.readFileSync(envPath, 'utf8');
    const hasDomain = /^DOMAIN=.+$/m.test(env) && !env.includes('DOMAIN=example.com');
    const hasJwt = /^JWT_SECRET=.+$/m.test(env) && !env.includes('CHANGE_ME');
    const hasDb = /^DATABASE_URL=.+$/m.test(env) && !/^DATABASE_URL=\s*$/m.test(env);
    return hasDomain && hasJwt && hasDb;
  } catch {
    return false;
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
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(env)) {
      env = env.replace(regex, `${key}=${value}`);
    } else {
      env += `\n${key}=${value}`;
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
  domain: z.string().min(1, 'Домен обязателен'),
  port: z.string().default('3000'),
  adminEmail: z.string().email('Неверный email'),
  adminPassword: z
    .string()
    .min(8, 'Минимум 8 символов')
    .regex(/[a-z]/, 'Хотя бы одна строчная буква')
    .regex(/[A-Z]/, 'Хотя бы одна заглавная буква')
    .regex(/[0-9]/, 'Хотя бы одна цифра'),
  adminName: z.string().min(1, 'Имя обязательно'),
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
  const frontendUrl = `https://${domain}`;

  writeEnv({
    DOMAIN: domain,
    NODE_ENV: 'production',
    PORT: port,
    FRONTEND_URL: frontendUrl,
    JWT_SECRET: jwtSecret,
    DATABASE_URL: 'postgresql://school:school_pass@db:5432/school',
    BACKUP_DIR: './backups',
    BACKUP_RETENTION_DAYS: '7',
  });

  // Store admin credentials for first boot seeding
  const credsPath = path.join(__dirname, '..', '.setup-creds.json');
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
