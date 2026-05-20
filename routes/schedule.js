// routes/schedule.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const logger = require('../middleware/logger');

// GET /api/schedule
router.get('/', auth, logger, async (req, res, next) => {
  try {
    const { class_id } = req.query;
    
    let query = `
      SELECT s.*, t.name as teacher_name, c.name as class_name
      FROM schedule s
      LEFT JOIN users t ON s.teacher_id = t.id
      LEFT JOIN classes c ON s.class_id = c.id
    `;
    const params = [];

    if (req.user.role === 'student' || req.user.role === 'parent') {
      const studentId = req.user.role === 'student' 
        ? req.user.id 
        : req.user.linked_student_id;
      
      const student = await db.get("SELECT class_id FROM users WHERE id = ?", [studentId]);
      if (student?.class_id) {
        query += " WHERE s.class_id = ?";
        params.push(student.class_id);
      }
    } else if (class_id && (req.user.role === 'teacher' || req.user.role === 'admin')) {
      query += " WHERE s.class_id = ?";
      params.push(class_id);
    }

    // Сортировка: дни недели + время
    query += ` ORDER BY 
      CASE s.day 
        WHEN 'Пн' THEN 1 WHEN 'Вт' THEN 2 WHEN 'Ср' THEN 3 
        WHEN 'Чт' THEN 4 WHEN 'Пт' THEN 5 WHEN 'Сб' THEN 6 
      END, s.time_slot`;

    const schedule = await db.all(query, params);
    res.json(schedule);
  } catch (err) {
    next(err);
  }
});

// POST /api/schedule (только учитель/админ)
router.post('/', auth, roles('teacher', 'admin'), logger, async (req, res, next) => {
  try {
    const { day, time_slot, subject, class_id, room } = req.body;
    
    if (!day || !time_slot || !subject || !class_id) {
      return res.status(400).json({ 
        error: 'day, time_slot, subject и class_id обязательны', 
        code: 'MISSING_FIELDS' 
      });
    }

    const result = await db.run(
      `INSERT INTO schedule (day, time_slot, subject, teacher_id, class_id, room) 
       VALUES (?,?,?,?,?,?)`,
      [day, time_slot, subject, req.user.id, class_id, room || null]
    );

    res.status(201).json({ 
      success: true, 
      schedule: { id: result.lastID, day, time_slot, subject, class_id, room } 
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/schedule/:id (только админ)
router.delete('/:id', auth, roles('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.run("DELETE FROM schedule WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;