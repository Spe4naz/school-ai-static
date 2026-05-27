const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const auth = require('../middleware/auth');
const logger = require('../middleware/logger');
const { notificationService } = require('../config/container');
const { LIMITS } = require('../config/constants');

router.use(auth, logger);

router.get('/', asyncHandler(async (req, res) => {
  const notifications = await notificationService.list(
    req.user.id,
    parseInt(req.query.limit) || LIMITS.NOTIFICATIONS,
  );
  res.json(notifications);
}));

router.put('/read', asyncHandler(async (req, res) => {
  await notificationService.markAsRead(req.user.id);
  res.json({ success: true });
}));

router.get('/unread-count', asyncHandler(async (req, res) => {
  const unread = await notificationService.getUnreadCount(req.user.id);
  res.json({ unread });
}));

// SSE endpoint for real-time notifications
const sseClients = new Map();

router.get('/stream', (req, res) => {
  let token = req.cookies?.token || req.query.token;
  if (!token) return res.status(401).json({ error: 'Токен обязателен' });
  try {
    const jwt = require('jsonwebtoken');
    const config = require('../config/auth');
    const decoded = jwt.verify(token, config.jwtSecret);
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write('data: {"connected":true}\n\n');

    if (!sseClients.has(decoded.id)) sseClients.set(decoded.id, []);
    sseClients.get(decoded.id).push(res);

    const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 15000);
    req.on('close', () => {
      clearInterval(heartbeat);
      const clients = sseClients.get(decoded.id);
      if (clients) {
        const idx = clients.indexOf(res);
        if (idx !== -1) clients.splice(idx, 1);
        if (clients.length === 0) sseClients.delete(decoded.id);
      }
    });
  } catch { res.status(403).json({ error: 'Невалидный токен' }); }
});

module.exports = { router, sseClients };
