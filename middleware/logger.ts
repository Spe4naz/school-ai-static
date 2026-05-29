const pino = require('pino');

const isTest = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'ci';

const logger = pino({
  level: isTest ? 'silent' : (process.env.NODE_ENV === 'production' ? 'warn' : 'info'),
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

module.exports = (req, res, next) => {
  if (isTest) return next();

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userId: req.user?.id || 'anonymous',
    });
  });

  next();
};

module.exports.logger = logger;
