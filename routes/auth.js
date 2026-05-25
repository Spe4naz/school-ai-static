const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { userService } = require('../config/container');
const config = require('../config/auth');
const emailTransporter = require('../config/email');
const { loginLimiter, registerLimiter, passwordResetLimiter } = require('../middleware/rateLimit');
const logger = require('../middleware/logger');
const { requiredFields, validateEmail, validatePassword, validateRole } = require('../middleware/validate');
const { ERR, ROLES, EMAIL_REGEX } = require('../config/constants');

router.post('/login', loginLimiter, logger, asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email и пароль обязательны', code: ERR.MISSING_FIELDS });
  }
  if (typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'Неверный формат email', code: ERR.INVALID_EMAIL });
  }

  const user = await userService.findByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Неверные данные', code: ERR.INVALID_CREDENTIALS });
  }

  // Update last login timestamp
  await userService.updateLastLogin(user.id);

  const token = jwt.sign(
    { id: user.id, role: user.role, name: user.name, class_id: user.class_id, linked_student_id: user.linked_student_id },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn },
  );

  res.json({
    token,
    user: { id: user.id, name: user.name, role: user.role, class_id: user.class_id, linked_student_id: user.linked_student_id },
  });
}));

router.post(
  '/register',
  registerLimiter,
  logger,
  requiredFields('email', 'password', 'name'),
  validateEmail,
  validatePassword,
  validateRole(ROLES.REGISTRABLE),
  asyncHandler(async (req, res) => {
    const { email, password, name, role, class_id, student_email, code } = req.body;

    const existing = await userService.findByEmail(email);
    if (existing) return res.status(409).json({ error: 'Email уже занят', code: ERR.EMAIL_EXISTS });

    // Teacher and head_teacher require a valid registration code
    if (role === 'teacher' || role === 'head_teacher') {
      if (!code) return res.status(400).json({ error: 'Требуется код регистрации', code: ERR.MISSING_FIELDS });
      const valid = await userService.validateRegistrationCode(code, role);
      if (!valid) return res.status(400).json({ error: 'Неверный или уже использованный код', code: ERR.INVALID_TOKEN });
    }

    let linked_student_id = null;
    if (role === 'parent' && student_email) {
      const student = await userService.findByEmail(student_email);
      if (!student || student.role !== 'student') {
        return res.status(400).json({ error: 'Ученик с таким email не найден', code: ERR.STUDENT_NOT_FOUND });
      }
      linked_student_id = student.id;
    }

    if (role === 'student' && !class_id) {
      return res.status(400).json({ error: 'Выберите класс', code: ERR.MISSING_CLASS });
    }

    const newUser = await userService.create({ email, password, name, role, class_id: role === 'student' ? class_id : null, linked_student_id });

    res.status(201).json({
      success: true,
      message: 'Аккаунт успешно создан!',
      user: { id: newUser.id, email: newUser.email },
    });
  }),
);

router.post('/password-reset/request', passwordResetLimiter, logger, asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email обязателен', code: ERR.MISSING_EMAIL });
  if (typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'Неверный формат email', code: ERR.INVALID_EMAIL });
  }

  const result = await userService.requestPasswordReset(email);
  if (!result) {
    return res.json({ success: true, message: 'Если аккаунт существует, инструкция отправлена' });
  }

  const { user, resetId } = result;
  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password.html?id=${resetId}&email=${encodeURIComponent(email)}`;

  await emailTransporter.sendMail({
    from: `"Умная Школа" <${process.env.SMTP_USER || 'noreply@lumira-server.ru'}>`,
    to: email,
    subject: 'Сброс пароля — Умная Школа',
    text: `Здравствуйте, ${user.name}!\n\nСсылка для сброса: ${resetLink}\n\nДействительна 1 час.`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#2563eb">Сброс пароля</h2>
      <p>Здравствуйте, <strong>${user.name}</strong>!</p>
      <p><a href="${resetLink}" style="background:#2563eb;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;margin:20px 0">Сбросить пароль</a></p>
      <p style="font-size:0.9rem;color:#666">Ссылка действительна <strong>1 час</strong>.</p>
    </div>`,
  });

  res.json({ success: true, message: 'Если аккаунт существует, инструкция отправлена' });
}));

router.post(
  '/password-reset/confirm',
  passwordResetLimiter,
  logger,
  requiredFields('id', 'email', 'newPassword'),
  validateEmail,
  validatePassword,
  asyncHandler(async (req, res) => {
    const { id, email, newPassword } = req.body;
    await userService.confirmPasswordReset(id, email, newPassword);
    res.json({ success: true, message: 'Пароль успешно изменён' });
  }),
);

module.exports = router;
