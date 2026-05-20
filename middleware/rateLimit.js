// middleware/rateLimit.js
const rateLimit = require('express-rate-limit');

// === Настройки для всех лимитеров ===
const baseConfig = {
  // Отключаем кастомный keyGenerator — используем встроенный (IPv6-safe)
  // keyGenerator: undefined, // по умолчанию библиотека сама обрабатывает IPv4/IPv6
  
  // Отключаем лимиты в тестовом режиме
  skip: (req) => process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID,
  
  // Заголовки для мониторинга (отключаем в тестах)
  standardHeaders: process.env.NODE_ENV !== 'test',
  legacyHeaders: false,
  
  // Обработчик превышения лимита
  handler: (req, res) => {
    res.status(429).json({ 
      error: 'Превышен лимит запросов', 
      code: 'RATE_LIMITED',
      retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
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

// === Лимитер для API (мягкий) ===
const apiLimiter = rateLimit({
  ...baseConfig,
  windowMs: 10 * 60 * 1000, // 10 минут
  max: 100, // 100 запросов с одного IP
  message: { error: 'Превышен лимит запросов', code: 'RATE_LIMITED' },
});

module.exports = { loginLimiter, apiLimiter };