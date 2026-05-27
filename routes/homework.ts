const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const logger = require('../middleware/logger');
const { z } = require('zod');
const { validate } = require('../middleware/validate');
const resolveClass = require('../utils/classResolver');
const { homeworkService } = require('../config/container');
const { ERR } = require('../config/constants');

const homeworkSchema = z.object({
  subject: z.string().min(1, 'subject обязателен').max(100),
  title: z.string().min(1, 'title обязателен').max(200),
  description: z.string().max(2000).optional().default(''),
  due_date: z.string().min(1, 'due_date обязателен').max(20),
});

router.use(auth, logger);

router.get('/', asyncHandler(async (req, res) => {
  const classId = await resolveClass(homeworkService, req.user);
  const homeworks = await homeworkService.list(classId);
  res.json(homeworks);
}));

router.post('/', roles('teacher', 'admin'), validate(homeworkSchema), asyncHandler(async (req, res) => {
  const { subject, title, description, due_date } = req.body;
  const classId = await resolveClass(homeworkService, req.user);
  const hw = await homeworkService.create({
    class_id: classId, teacher_id: req.user.id, subject, title, description, due_date,
  });
  res.json(hw);
}));

router.delete('/:id', roles('teacher', 'admin'), asyncHandler(async (req, res) => {
  const deleted = await homeworkService.delete(req.params.id, req.user.id);
  if (!deleted) return res.status(404).json({ error: 'Не найдено или нет прав', code: ERR.NOT_FOUND });
  res.json({ ok: true });
}));

module.exports = router;
