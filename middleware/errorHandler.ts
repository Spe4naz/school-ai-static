// middleware/errorHandler.js
module.exports = (err, req, res, next) => {
  console.error('Error:', err.stack);

  if (err.status && err.code) {
    return res.status(err.status).json({ error: err.message, code: err.code });
  }

  if (err.code === '23505') {
    return res.status(409).json({ error: 'Запись уже существует', code: 'CONFLICT' });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message, code: 'VALIDATION_ERROR' });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Ошибка токена', code: 'TOKEN_ERROR' });
  }

  res.status(500).json({
    error: 'Внутренняя ошибка сервера',
    code: 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { debug: err.message }),
  });
};
