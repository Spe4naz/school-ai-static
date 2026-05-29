// middleware/rateLimit.js
const rateLimit = require('express-rate-limit');

// === Настройки для всех лимитеров ===
const baseConfig = {
  // Отключаем лимиты в тестовом режиме
  skip: () => process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID,

  // Заголовки для мониторинга (отключаем в тестах)
  standardHeaders: process.env.NODE_ENV !== 'test',
  legacyHeaders: false,

  // Обработчик превышения лимита
  handler: (req, res) => {
    res.status(429).json({
      error: 'Превышен лимит запросов',
      code: 'RATE_LIMITED',
      retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000),
    });
  },
};

// === Лимитер для входа (строгий) ===
const loginLimiter = rateLimit({
  ...baseConfig,
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 5, // 5 попыток с одного IP
  message: { error: 'Слишком много попыток входа', code: 'RATE_LIMITED' },
});

// === Лимитер для сброса пароля (строгий) ===
const passwordResetLimiter = rateLimit({
  ...baseConfig,
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 3, // 3 запроса с одного IP
  message: { error: 'Слишком много попыток сброса пароля', code: 'RATE_LIMITED' },
});

// === Лимитер для обновления токена ===
const refreshLimiter = rateLimit({
  ...baseConfig,
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 10, // 10 запросов с одного IP
  message: { error: 'Слишком много попыток обновления токена', code: 'RATE_LIMITED' },
});

// === Лимитер для API (мягкий) ===
const apiLimiter = rateLimit({
  ...baseConfig,
  windowMs: 10 * 60 * 1000, // 10 минут
  max: 100, // 100 запросов с одного IP
  message: { error: 'Превышен лимит запросов', code: 'RATE_LIMITED' },
});

const writeLimiter = rateLimit({
  ...baseConfig,
  windowMs: 1 * 60 * 1000, // 1 минута
  max: 30, // 30 запросов с одного IP
  message: { error: 'Превышен лимит запросов', code: 'RATE_LIMITED' },
});

// === Лимитер для загрузки файлов ===
const uploadLimiter = rateLimit({
  ...baseConfig,
  windowMs: 10 * 60 * 1000, // 10 минут
  max: 10, // 10 загрузок с одного IP
  message: { error: 'Слишком много загрузок файлов', code: 'RATE_LIMITED' },
});

// === Per-user лимитер для аутентифицированных эндпоинтов ===
const userLimiter = rateLimit({
  ...baseConfig,
  windowMs: 1 * 60 * 1000, // 1 минута
  max: 60, // 60 запросов на пользователя в минуту
  keyGenerator: (req) => req.user?.id || req.ip,
  validate: { ipKeyGenerator: false, default: true },
  message: { error: 'Превышен лимит запросов', code: 'RATE_LIMITED' },
});

module.exports = { loginLimiter, passwordResetLimiter, refreshLimiter, apiLimiter, writeLimiter, uploadLimiter, userLimiter };
