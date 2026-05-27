// config/auth.js
module.exports = {
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: '24h',
  refreshExpiresInMs: 30 * 24 * 60 * 60 * 1000, // 30 дней
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || (process.env.NODE_ENV === 'production' ? 12 : 8),
  resetTokenExpiry: 60 * 60 * 1000, // 1 час
};
