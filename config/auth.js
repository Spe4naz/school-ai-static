// config/auth.js
module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_key_change_in_production',
  jwtExpiresIn: '24h',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || (process.env.NODE_ENV === 'production' ? 12 : 8),
  resetTokenExpiry: 60 * 60 * 1000, // 1 час
};
