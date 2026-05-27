const jwt = require('jsonwebtoken');
const config = require('../config/auth');

module.exports = (req, res, next) => {
  let token = req.headers.authorization?.split(' ')[1];
  if (!token) token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация', code: 'AUTH_REQUIRED' });
  }

  try {
    req.user = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'], issuer: 'school-ai' });
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Токен истёк', code: 'TOKEN_EXPIRED' });
    }
    return res.status(403).json({ error: 'Невалидный токен', code: 'TOKEN_INVALID' });
  }
};
