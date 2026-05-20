// routes/grades.js
const express = require('express');
const router = express.Router();
const gradeService = require('../services/gradeService');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const logger = require('../middleware/logger');

// GET /api/grades
router.get('/', auth, logger, async (req, res, next) => {
  try {
    const { class_id } = req.query;
    const grades = await gradeService.list({ class_id, user: req.user });
    res.json(grades);
  } catch (err) {
    next(err);
  }
});

// POST /api/grades
router.post('/', auth, roles('teacher', 'admin'), logger, async (req, res, next) => {
  try {
    const { student_id, subject, grade, comment } = req.body;
    
    if (!student_id || !subject || grade === undefined) {
      return res.status(400).json({ error: 'student_id, subject и grade обязательны', code: 'MISSING_FIELDS' });
    }
    if (grade < 2 || grade > 5) {
      return res.status(400).json({ error: 'Оценка должна быть от 2 до 5', code: 'INVALID_GRADE' });
    }

    const result = await gradeService.create({
      student_id,
      teacher_id: req.user.id,
      subject,
      grade: parseInt(grade),
      comment
    });

    res.json({ success: true, grade: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/grades/stats
router.get('/stats', auth, roles('teacher', 'admin'), async (req, res, next) => {
  try {
    const { class_id } = req.query;
    if (!class_id) return res.status(400).json({ error: 'class_id обязателен', code: 'MISSING_CLASS' });
    
    const stats = await gradeService.getStats(class_id);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

module.exports = router;