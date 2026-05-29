import rateLimit from 'express-rate-limit';

const isTest = process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID;

const baseConfig = {
  skip: () => isTest,
  standardHeaders: !isTest,
  legacyHeaders: false,
  handler: (req: any, res: any) => {
    res.status(429).json({
      error: 'Превышен лимит запросов',
      code: 'RATE_LIMITED',
      retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000),
    });
  },
};

export const loginLimiter = rateLimit({
  ...baseConfig,
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Слишком много попыток входа', code: 'RATE_LIMITED' },
});

export const passwordResetLimiter = rateLimit({
  ...baseConfig,
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { error: 'Слишком много попыток сброса пароля', code: 'RATE_LIMITED' },
});

export const refreshLimiter = rateLimit({
  ...baseConfig,
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Слишком много попыток обновления токена', code: 'RATE_LIMITED' },
});

export const apiLimiter = rateLimit({
  ...baseConfig,
  windowMs: 10 * 60 * 1000,
  max: 100,
  message: { error: 'Превышен лимит запросов', code: 'RATE_LIMITED' },
});

export const writeLimiter = rateLimit({
  ...baseConfig,
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: { error: 'Превышен лимит запросов', code: 'RATE_LIMITED' },
});

export const uploadLimiter = rateLimit({
  ...baseConfig,
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: { error: 'Слишком много загрузок файлов', code: 'RATE_LIMITED' },
});

export const userLimiter = rateLimit({
  ...baseConfig,
  windowMs: 1 * 60 * 1000,
  max: 60,
  keyGenerator: (req: any) => req.user?.id || req.ip,
  message: { error: 'Превышен лимит запросов', code: 'RATE_LIMITED' },
});
