const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { userService } = require('../config/container');
const config = require('../config/auth');
const emailTransporter = require('../config/email');
const auth = require('../middleware/auth');
const { loginLimiter, passwordResetLimiter } = require('../middleware/rateLimit');
const logger = require('../middleware/logger');
const { validate, loginSchema, passwordResetRequestSchema, passwordResetConfirmSchema } = require('../middleware/validate');
const { ERR } = require('../config/constants');

router.post('/login', loginLimiter, logger, validate(loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await userService.findByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Неверные данные', code: ERR.INVALID_CREDENTIALS });
  }

  await userService.updateLastLogin(user.id);

  const accessToken = jwt.sign(
    { id: user.id, role: user.role, name: user.name, class_id: user.class_id, linked_student_id: user.linked_student_id },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn, issuer: 'school-ai' },
  );

  const refreshToken = await userService.createRefreshToken(user.id);

  res.cookie('token', accessToken, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000,
  });

  res.json({
    token: accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, role: user.role, class_id: user.class_id, linked_student_id: user.linked_student_id },
  });
}));

router.post('/refresh', logger, asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: 'refreshToken обязателен', code: ERR.MISSING_FIELDS });
  }

  const payload = await userService.consumeRefreshToken(refreshToken);
  if (!payload) {
    return res.status(401).json({ error: 'Невалидный или истёкший refresh-токен', code: ERR.INVALID_TOKEN });
  }

  const user = await userService.findById(payload.user_id);
  if (!user) {
    return res.status(401).json({ error: 'Пользователь не найден', code: ERR.NOT_FOUND });
  }

  const accessToken = jwt.sign(
    { id: user.id, role: user.role, name: user.name, class_id: user.class_id, linked_student_id: user.linked_student_id },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn, issuer: 'school-ai' },
  );

  const newRefreshToken = await userService.createRefreshToken(user.id);

  res.cookie('token', accessToken, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000,
  });

  res.json({ token: accessToken, refreshToken: newRefreshToken });
}));

router.post('/password-reset/request', passwordResetLimiter, logger, validate(passwordResetRequestSchema), asyncHandler(async (req, res) => {
  const { email } = req.body;

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

router.post('/password-reset/confirm', passwordResetLimiter, logger, validate(passwordResetConfirmSchema), asyncHandler(async (req, res) => {
  const { id, email, newPassword } = req.body;
  await userService.confirmPasswordReset(id, email, newPassword);
  res.json({ success: true, message: 'Пароль успешно изменён' });
}));

router.post('/logout', logger, asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await userService.consumeRefreshToken(refreshToken).catch(() => {});
  }
  res.clearCookie('token', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
  res.json({ success: true, message: 'Выход выполнен' });
}));

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'currentPassword обязателен'),
  newPassword: z.string().min(6, 'Новый пароль должен быть минимум 6 символов').max(128),
});

router.post('/password/change', auth, logger, validate(passwordChangeSchema), asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await userService.findById(req.user.id);
  if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
    return res.status(400).json({ error: 'Неверный текущий пароль', code: ERR.INVALID_CREDENTIALS });
  }
  await userService.updatePassword(req.user.id, newPassword);
  res.json({ success: true, message: 'Пароль изменён' });
}));

module.exports = router;
