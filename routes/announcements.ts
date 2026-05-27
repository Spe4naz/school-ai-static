const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const logger = require('../middleware/logger');
const { z } = require('zod');
const { validate } = require('../middleware/validate');
const { announcementService } = require('../config/container');
const { ERR } = require('../config/constants');

const announcementSchema = z.object({
  title: z.string().min(1, 'title обязателен').max(200),
  content: z.string().min(1, 'content обязателен').max(5000),
});

router.use(auth, logger);

router.get('/', asyncHandler(async (req, res) => {
  const announcements = await announcementService.list();
  res.json(announcements);
}));

router.post('/', roles('teacher', 'admin'), validate(announcementSchema), asyncHandler(async (req, res) => {
  const { title, content } = req.body;
  const a = await announcementService.create({ user_id: req.user.id, title, content });
  res.json(a);
}));

router.delete('/:id', roles('admin'), asyncHandler(async (req, res) => {
  const deleted = await announcementService.delete(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Не найдено', code: ERR.NOT_FOUND });
  res.json({ ok: true });
}));

module.exports = router;
