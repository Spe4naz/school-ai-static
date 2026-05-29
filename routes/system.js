// routes/system.js — System management API (Docker, logs, status)
const express = require('express');
const router = express.Router();
const os = require('os');
const fs = require('fs');
const path = require('path');
const dockerService = require('../services/dockerService');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const logger = require('../middleware/logger');

const protect = [auth, logger, roles('admin')];

// System status
router.get('/status', ...protect, async (req, res) => {
  const db = require('../config/database');
  let dbStatus = 'ok';
  try {
    await db.query('SELECT 1');
  } catch (e) {
    dbStatus = 'error: ' + e.message;
  }

  const dockerInfo = await dockerService.getDockerInfo();
  const containers = await dockerService.getContainers();

  res.json({
    server: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    system: {
      hostname: os.hostname(),
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      loadAverage: os.loadavg(),
    },
    database: { status: dbStatus },
    docker: dockerInfo,
    containers,
  });
});

// Container management
router.get('/containers', ...protect, async (req, res) => {
  const containers = await dockerService.getContainers();
  res.json(containers);
});

router.get('/containers/:name', ...protect, async (req, res) => {
  const container = await dockerService.getContainer(req.params.name);
  if (!container) return res.status(404).json({ error: 'Контейнер не найден' });
  res.json(container);
});

router.get('/containers/:name/logs', ...protect, async (req, res) => {
  const lines = parseInt(req.query.lines) || 100;
  const logs = await dockerService.getContainerLogs(req.params.name, lines);
  res.json({ logs });
});

router.post('/containers/:name/start', ...protect, async (req, res) => {
  try {
    await dockerService.startContainer(req.params.name);
    res.json({ success: true, message: `${req.params.name} запущен` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/containers/:name/stop', ...protect, async (req, res) => {
  try {
    await dockerService.stopContainer(req.params.name);
    res.json({ success: true, message: `${req.params.name} остановлен` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/containers/:name/restart', ...protect, async (req, res) => {
  try {
    await dockerService.restartContainer(req.params.name);
    res.json({ success: true, message: `${req.params.name} перезапущен` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// App logs
router.get('/logs', ...protect, async (req, res) => {
  const lines = parseInt(req.query.lines) || 200;
  try {
    const output = await dockerService.execAsync(`docker logs --tail ${lines} school-app 2>&1`);
    res.json({ logs: output });
  } catch {
    res.json({ logs: 'Нет логов (контейнер не найден или Docker недоступен)' });
  }
});

// Backup management
router.get('/backups', ...protect, async (req, res) => {
  const { backupService } = require('../config/container');
  try {
    const backups = await backupService.list();
    res.json(backups);
  } catch {
    res.json([]);
  }
});

router.post('/backups', ...protect, async (req, res) => {
  const { backupService } = require('../config/container');
  const backupPath = await backupService.create();
  res.json({ success: true, path: backupPath });
});

router.get('/backups/:name/download', ...protect, async (req, res) => {
  const { backupService } = require('../config/container');
  const filePath = backupService.getPath(req.params.name);
  res.download(filePath);
});

router.delete('/backups/:name', ...protect, async (req, res) => {
  const { backupService } = require('../config/container');
  const result = await backupService.remove(req.params.name);
  res.json(result);
});

// Environment config (read-only, masked)
router.get('/config', ...protect, async (req, res) => {
  res.json({
    nodeEnv: process.env.NODE_ENV,
    domain: process.env.DOMAIN,
    port: process.env.PORT,
    frontendUrl: process.env.FRONTEND_URL,
    jwtSecretSet: !!process.env.JWT_SECRET,
    databaseUrlSet: !!process.env.DATABASE_URL,
    smtpHost: process.env.SMTP_HOST || 'не настроен',
    backupDir: process.env.BACKUP_DIR || './backups',
    backupRetention: parseInt(process.env.BACKUP_RETENTION_DAYS || '7', 10),
  });
});

module.exports = router;
