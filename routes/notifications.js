// routes/notifications.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const logger = require('../middleware/logger');

// GET /api/notifications
router.get('/', auth, logger, async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;
    const notifications = await db.all(
      `SELECT * FROM notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [req.user.id, parseInt(limit)]
    );
    res.json(notifications);
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/read
router.put('/read', auth, logger, async (req, res, next) => {
  try {
    await db.run(
      "UPDATE notifications SET is_read = 1 WHERE user_id = ?",
      [req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', auth, async (req, res, next) => {
  try {
    const { count } = await db.get(
      "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0",
      [req.user.id]
    );
    res.json({ unread: count || 0 });
  } catch (err) {
    next(err);
  }
});

module.exports = router;