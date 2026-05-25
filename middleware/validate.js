const { ERR, EMAIL_REGEX } = require('../config/constants');

function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[<>]/g, '').trim();
}

function requiredFields(...fields) {
  return (req, res, next) => {
    for (const f of fields) {
      if (req.body[f] === undefined || req.body[f] === null || req.body[f] === '') {
        return res.status(400).json({ error: 'Все поля обязательны', code: ERR.MISSING_FIELDS });
      }
      if (typeof req.body[f] === 'string') {
        req.body[f] = sanitize(req.body[f]);
      }
    }
    next();
  };
}

function validateEmail(req, res, next) {
  const { email } = req.body;
  if (typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'Неверный формат email', code: ERR.INVALID_EMAIL });
  }
  req.body.email = email.trim().toLowerCase();
  next();
}

function validatePassword(req, res, next) {
  const { newPassword, password } = req.body;
  const pwd = newPassword || password;
  if (pwd && pwd.length < 6) {
    return res.status(400).json({ error: 'Пароль должен быть минимум 6 символов', code: ERR.WEAK_PASSWORD });
  }
  if (pwd && pwd.length > 128) {
    return res.status(400).json({ error: 'Пароль слишком длинный', code: ERR.WEAK_PASSWORD });
  }
  next();
}

function validateRole(allowedRoles) {
  return (req, res, next) => {
    const { role } = req.body;
    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Неверная роль', code: ERR.INVALID_ROLE });
    }
    next();
  };
}

function validateGrade(req, res, next) {
  const { grade } = req.body;
  const g = parseInt(grade, 10);
  if (isNaN(g) || g < 2 || g > 5) {
    return res.status(400).json({ error: 'Оценка должна быть от 2 до 5', code: ERR.INVALID_GRADE });
  }
  req.body.grade = g;
  next();
}

module.exports = {
  requiredFields,
  validateEmail,
  validatePassword,
  validateRole,
  validateGrade,
};
