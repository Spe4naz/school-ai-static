const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const { scheduleService } = require('../config/container');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const logger = require('../middleware/logger');
const { z } = require('zod');
const { validate } = require('../middleware/validate');
const { ERR } = require('../config/constants');

router.use(auth, logger);

const createScheduleSchema = z.object({
  day: z.string().min(1).max(10),
  time_slot: z.string().min(1).max(20),
  subject: z.string().min(1).max(100),
  class_id: z.string().min(1),
  room: z.string().max(50).optional(),
});

router.get('/', asyncHandler(async (req, res) => {
  const schedule = await scheduleService.list({ class_id: req.query.class_id, user: req.user });
  res.json(schedule);
}));

router.post(
  '/',
  roles('teacher', 'admin'),
  validate(createScheduleSchema),
  asyncHandler(async (req, res) => {
    const { day, time_slot, subject, class_id, room } = req.body;
    await scheduleService.create({ day, time_slot, subject, teacher_id: req.user.id, class_id, room });
    res.status(201).json({ success: true, message: 'Урок добавлен' });
  }),
);

router.delete('/:id', asyncHandler(async (req, res) => {
  await scheduleService.delete(req.params.id, req.user.id, req.user.role);
  res.json({ success: true, message: 'Урок удалён' });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  await scheduleService.update(req.params.id, req.user.id, req.user.role, req.body);
  res.json({ success: true, message: 'Урок обновлён' });
}));

module.exports = router;
