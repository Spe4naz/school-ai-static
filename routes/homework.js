const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const logger = require('../middleware/logger');
const resolveClass = require('../utils/classResolver');
const { homeworkService } = require('../config/container');
const { ERR } = require('../config/constants');

router.use(auth, logger);

router.get('/', asyncHandler(async (req, res) => {
  const classId = await resolveClass(homeworkService, req.user);
  const homeworks = await homeworkService.list(classId);
  res.json(homeworks);
}));

router.post('/', roles('teacher', 'admin'), asyncHandler(async (req, res) => {
  const { subject, title, description, due_date } = req.body;
  if (!subject || !title || !due_date) {
    return res.status(400).json({ error: 'Заполните обязательные поля', code: ERR.MISSING_FIELDS });
  }
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
