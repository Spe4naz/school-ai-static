const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const logger = require('../middleware/logger');
const { announcementService } = require('../config/container');
const { ERR } = require('../config/constants');

router.use(auth, logger);

router.get('/', asyncHandler(async (req, res) => {
  const announcements = await announcementService.list();
  res.json(announcements);
}));

router.post('/', roles('teacher', 'admin'), asyncHandler(async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'Заполните заголовок и текст', code: ERR.MISSING_FIELDS });
  }
  const a = await announcementService.create({ user_id: req.user.id, title, content });
  res.json(a);
}));

router.delete('/:id', roles('admin'), asyncHandler(async (req, res) => {
  const deleted = await announcementService.delete(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Не найдено', code: ERR.NOT_FOUND });
  res.json({ ok: true });
}));

module.exports = router;
