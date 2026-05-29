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
const { loginLimiter, passwordResetLimiter, refreshLimiter } = require('../middleware/rateLimit');
const logger = require('../middleware/logger');
const { validate, loginSchema, registerSchema, passwordSchema, passwordResetRequestSchema, passwordResetConfirmSchema } = require('../middleware/validate');
const { ERR } = require('../config/constants');

const isProd = process.env.NODE_ENV === 'production';
const COOKIE_BASE = { httpOnly: true, sameSite: 'strict', secure: isProd };
const TOKEN_COOKIE = { ...COOKIE_BASE, maxAge: 24 * 60 * 60 * 1000 };
const REFRESH_COOKIE = { ...COOKIE_BASE, maxAge: 30 * 24 * 60 * 60 * 1000 };

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name, class_id: user.class_id, linked_student_id: user.linked_student_id },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn, issuer: 'school-ai' },
  );
}

function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie('token', accessToken, TOKEN_COOKIE);
  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE);
}

function clearAuthCookies(res) {
  res.clearCookie('token', COOKIE_BASE);
  res.clearCookie('refreshToken', COOKIE_BASE);
}

router.post('/register', validate(registerSchema), asyncHandler(async (req, res) => {
  const { email, password, name, role, class_id, student_email, code } = req.body;

  if (['teacher', 'head_teacher'].includes(role)) {
    if (!code) {
      return res.status(400).json({ error: 'Требуется код регистрации', code: ERR.MISSING_FIELDS });
    }
    const valid = await userService.validateRegistrationCode(code, role);
    if (!valid) {
      return res.status(400).json({ error: 'Неверный или использованный код', code: ERR.INVALID_TOKEN });
    }
  }

  let linked_student_id = null;
  if (role === 'parent' && student_email) {
    const student = await userService.findByEmail(student_email);
    if (student) linked_student_id = student.id;
  }

  const existing = await userService.findByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'Email уже зарегистрирован', code: ERR.EMAIL_EXISTS });
  }

  const newUser = await userService.create({
    email, password, name, role,
    class_id: role === 'student' ? class_id || null : null,
    linked_student_id,
  });

  res.status(201).json({ success: true, user: { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role } });
}));

router.post('/login', loginLimiter, logger, validate(loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await userService.findByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Неверные данные', code: ERR.INVALID_CREDENTIALS });
  }

  await userService.updateLastLogin(user.id);

  const accessToken = signAccessToken(user);
  const refreshToken = await userService.createRefreshToken(user.id);

  setAuthCookies(res, accessToken, refreshToken);

  res.json({
    user: { id: user.id, name: user.name, role: user.role, class_id: user.class_id, linked_student_id: user.linked_student_id },
  });
}));

router.post('/refresh', refreshLimiter, logger, asyncHandler(async (req, res) => {
  const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
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

  const accessToken = signAccessToken(user);
  const newRefreshToken = await userService.createRefreshToken(user.id);

  setAuthCookies(res, accessToken, newRefreshToken);

  res.json({ success: true });
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
      <p>Здравствуйте, <strong>${escapeHtml(user.name)}</strong>!</p>
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
  const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
  if (refreshToken) {
    await userService.consumeRefreshToken(refreshToken).catch(() => {});
  }
  clearAuthCookies(res);
  res.json({ success: true, message: 'Выход выполнен' });
}));

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'currentPassword обязателен'),
  newPassword: passwordSchema,
});

router.post('/password/change', auth, logger, validate(passwordChangeSchema), asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await userService.findById(req.user.id);
  if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
    return res.status(400).json({ error: 'Неверный текущий пароль', code: ERR.INVALID_CREDENTIALS });
  }
  await userService.updatePassword(req.user.id, newPassword);
  await userService.invalidateAllRefreshTokens(req.user.id);
  clearAuthCookies(res);
  res.json({ success: true, message: 'Пароль изменён. Войдите заново.' });
}));

module.exports = router;
