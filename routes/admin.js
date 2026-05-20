// routes/admin.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const logger = require('../middleware/logger');

// GET /api/classes
router.get('/classes', auth, logger, async (req, res, next) => {
  try {
    const classes = await db.all("SELECT * FROM classes ORDER BY name");
    res.json(classes);
  } catch (err) {
    next(err);
  }
});

// POST /api/classes (только админ)
router.post('/classes', auth, roles('admin'), async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name обязателен', code: 'MISSING_NAME' });
    
    const result = await db.run("INSERT INTO classes (id, name) VALUES (?,?)", 
      [require('crypto').randomBytes(16).toString('hex'), name]);
    
    res.status(201).json({ success: true, class: { id: result.lastID, name } });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Класс уже существует', code: 'CONFLICT' });
    }
    next(err);
  }
});

// GET /api/logs (только админ)
router.get('/logs', auth, roles('admin'), logger, async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;
    const logs = await db.all(`
      SELECT l.*, u.name as user_name 
      FROM logs l 
      LEFT JOIN users u ON l.user_id = u.id 
      ORDER BY l.timestamp DESC 
      LIMIT ?
    `, [parseInt(limit)]);
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/stats
router.get('/stats', auth, roles('admin'), async (req, res, next) => {
  try {
    const [users, grades, classes] = await Promise.all([
      db.get("SELECT COUNT(*) as count FROM users"),
      db.get("SELECT COUNT(*) as count FROM grades"),
      db.get("SELECT COUNT(*) as count FROM classes"),
    ]);

    res.json({
      totalUsers: users.count,
      totalGrades: grades.count,
      totalClasses: classes.count,
      lastBackup: null, // Можно добавить из backupService
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;