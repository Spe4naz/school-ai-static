// routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const userService = require('../services/userService');
const config = require('../config/auth');
const emailTransporter = require('../config/email');
const { loginLimiter } = require('../middleware/rateLimit');
const logger = require('../middleware/logger');

// POST /api/login
router.post('/login', loginLimiter, logger, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны', code: 'MISSING_FIELDS' });
    }

    const user = await userService.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Неверные данные', code: 'INVALID_CREDENTIALS' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        class_id: user.class_id,
        linked_student_id: user.linked_student_id,
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/register
router.post('/register', logger, async (req, res, next) => {
  try {
    const { email, password, name, role, class_id, student_email } = req.body;
    
    if (!['student', 'parent'].includes(role)) {
      return res.status(400).json({ error: 'Саморегистрация только для учеников и родителей', code: 'INVALID_ROLE' });
    }

    const existing = await userService.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Email уже занят', code: 'EMAIL_EXISTS' });
    }

    let linked_student_id = null;
    if (role === 'parent' && student_email) {
      const student = await userService.findByEmail(student_email);
      if (!student || student.role !== 'student') {
        return res.status(400).json({ error: 'Ученик не найден', code: 'STUDENT_NOT_FOUND' });
      }
      linked_student_id = student.id;
    }

    const newUser = await userService.create({
      email, password, name, role, class_id, linked_student_id
    });

    res.status(201).json({ success: true, user: { id: newUser.id, email: newUser.email } });
  } catch (err) {
    next(err);
  }
});

// POST /api/password-reset/request
router.post('/password-reset/request', logger, async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email обязателен', code: 'MISSING_EMAIL' });

    const result = await userService.requestPasswordReset(email);
    
    // Всегда возвращаем успех (защита от перебора)
    if (!result) {
      return res.json({ success: true, message: 'Если аккаунт существует, инструкция отправлена' });
    }

    const { user, resetToken } = result;
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    await emailTransporter.sendMail({
      from: `"Умная Школа" <${process.env.SMTP_USER || 'noreply@lumira-server.ru'}>`,
      to: email,
      subject: '🔐 Сброс пароля — Умная Школа',
      text: `Здравствуйте, ${user.name}!\n\nСсылка для сброса: ${resetLink}\n\nДействительна 1 час.`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#2563eb">🔐 Сброс пароля</h2>
        <p>Здравствуйте, <strong>${user.name}</strong>!</p>
        <p><a href="${resetLink}" style="background:#2563eb;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;margin:20px 0">Сбросить пароль</a></p>
        <p style="font-size:0.9rem;color:#666">Ссылка действительна <strong>1 час</strong>.</p>
      </div>`
    });

    res.json({ success: true, message: 'Если аккаунт существует, инструкция отправлена' });
  } catch (err) {
    next(err);
  }
});

// POST /api/password-reset/confirm
router.post('/password-reset/confirm', logger, async (req, res, next) => {
  try {
    const { token, email, newPassword } = req.body;
    
    if (!token || !email || !newPassword) {
      return res.status(400).json({ error: 'Все поля обязательны', code: 'MISSING_FIELDS' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов', code: 'WEAK_PASSWORD' });
    }

    await userService.confirmPasswordReset(email, token, newPassword);
    
    res.json({ success: true, message: 'Пароль успешно изменён' });
  } catch (err) {
    if (err.message === 'Неверный или истёкший токен') {
      return res.status(400).json({ error: err.message, code: 'INVALID_TOKEN' });
    }
    next(err);
  }
});

module.exports = router;