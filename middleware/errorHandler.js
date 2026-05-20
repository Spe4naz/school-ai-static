// middleware/errorHandler.js
module.exports = (err, req, res, next) => {
  console.error('❌ Error:', err.stack);

  // Известные ошибки
  if (err.code === 'SQLITE_CONSTRAINT' && err.message.includes('UNIQUE')) {
    return res.status(409).json({ error: 'Запись уже существует', code: 'CONFLICT' });
  }

  // Ошибки валидации
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message, code: 'VALIDATION_ERROR' });
  }

  // Ошибки JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Ошибка токена', code: 'TOKEN_ERROR' });
  }

  // Дефолт: 500
  res.status(500).json({ 
    error: 'Внутренняя ошибка сервера', 
    code: 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { debug: err.message })
  });
};