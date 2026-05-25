const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const { gradeService } = require('../config/container');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const logger = require('../middleware/logger');
const resolveStudentId = require('../middleware/resolveStudentId');
const { requiredFields, validateGrade } = require('../middleware/validate');
const { ERR } = require('../config/constants');

router.use(auth, logger);

router.get('/', asyncHandler(async (req, res) => {
  const { class_id, week_offset } = req.query;
  const grades = await gradeService.list({ class_id, user: req.user, week_offset });
  res.json(grades);
}));

router.post(
  '/',
  roles('teacher', 'admin'),
  requiredFields('student_id', 'subject', 'grade'),
  validateGrade,
  asyncHandler(async (req, res) => {
    const { student_id, subject, grade, comment } = req.body;
    const result = await gradeService.create({
      student_id,
      teacher_id: req.user.id,
      subject,
      grade: parseInt(grade),
      comment,
    });
    res.json({ success: true, grade: result });
  }),
);

router.get('/stats', roles('teacher', 'admin'), asyncHandler(async (req, res) => {
  const { class_id } = req.query;
  if (!class_id) return res.status(400).json({ error: 'class_id обязателен', code: ERR.MISSING_CLASS });
  const stats = await gradeService.getStats(class_id);
  res.json(stats);
}));

router.get('/progress', resolveStudentId, asyncHandler(async (req, res) => {
  const { subject, period } = req.query;
  const progress = await gradeService.getProgress(req.studentId, subject || 'all', period || 'month');
  res.json(progress);
}));

router.get('/subjects', resolveStudentId, asyncHandler(async (req, res) => {
  const subjects = await gradeService.getSubjects(req.studentId);
  res.json(subjects);
}));

module.exports = router;
