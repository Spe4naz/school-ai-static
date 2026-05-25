const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const asyncHandler = require('../middleware/asyncHandler');
const auth = require('../middleware/auth');
const logger = require('../middleware/logger');
const resolveClass = require('../utils/classResolver');
const { chatService } = require('../config/container');
const { ERR, LIMITS } = require('../config/constants');

router.use(auth, logger);

const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
const fs = require('fs');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Только изображения: jpg, png, gif, webp'));
  },
});

router.get('/messages', asyncHandler(async (req, res) => {
  const classId = await resolveClass(chatService, req.user);
  const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || LIMITS.CHAT_MESSAGES));
  const messages = await chatService.getMessages(classId, offset, limit);
  const total = (await chatService.db.get('SELECT COUNT(*) as count FROM messages WHERE class_id = $1', [classId]));
  res.json({ messages, total: parseInt(total?.count || 0, 10), offset, limit });
}));

router.post('/messages', asyncHandler(async (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Сообщение не может быть пустым', code: ERR.EMPTY_MESSAGE });
  }
  const classId = await resolveClass(chatService, req.user);
  const message = await chatService.sendMessage(classId, req.user.id, content.trim());
  res.json(message);
}));

router.delete('/messages/:id', asyncHandler(async (req, res) => {
  const deleted = await chatService.deleteMessage(req.params.id, req.user.id);
  if (!deleted) return res.status(404).json({ error: 'Сообщение не найдено или нет прав', code: ERR.NOT_FOUND });
  res.json({ ok: true });
}));

router.post('/upload', upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл не загружен', code: ERR.MISSING_FIELDS });

  const classId = await resolveClass(chatService, req.user);
  const imageUrl = `/uploads/${req.file.filename}`;
  const message = await chatService.sendMessage(classId, req.user.id, '[Изображение]', imageUrl);
  res.json(message);
}));

router.get('/key', asyncHandler(async (req, res) => {
  const classId = await resolveClass(chatService, req.user);
  const key = await chatService.getOrCreateClassKey(classId);
  res.json({ key });
}));

router.get('/participants', asyncHandler(async (req, res) => {
  const classId = await resolveClass(chatService, req.user);
  const participants = await chatService.getParticipants(classId);
  res.json(participants);
}));

router.post('/typing', asyncHandler(async (req, res) => {
  const classId = await resolveClass(chatService, req.user);
  await chatService.setTyping(classId, req.user.id, req.user.name);
  await chatService.clearStaleTyping(classId);
  res.json({ ok: true });
}));

router.get('/typing', asyncHandler(async (req, res) => {
  const classId = await resolveClass(chatService, req.user);
  const typing = await chatService.getTyping(classId, req.user.id);
  res.json(typing);
}));

module.exports = router;
