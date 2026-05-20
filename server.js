// server.js — чистый и минималистичный
require('dotenv').config();

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cron = require('node-cron');

const db = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimit');
const backupService = require('./services/backupService');

// Роуты
const authRoutes = require('./routes/auth');
const gradeRoutes = require('./routes/grades');
const scheduleRoutes = require('./routes/schedule');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// 🔐 Безопасность
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// 📊 Логирование и лимиты
app.use('/api', apiLimiter);

// 🛣️ Роуты
app.use('/api', authRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api', adminRoutes);

// ❌ Обработчик ошибок (последний middleware)
app.use(errorHandler);

// 💾 Авто-бэкапы
async function startApp() {
  await db.init();
  await backupService.init();
  
  // Бэкап каждый час
  cron.schedule('0 * * * *', async () => {
    try {
      await backupService.create();
    } catch (err) {
      console.error('❌ Ошибка бэкапа:', err);
    }
  });

  app.listen(PORT, () => {
    console.log(`🚀 Умная Школа: http://localhost:${PORT}`);
    console.log(`🛡️ Режим: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💾 Бэкапы: ${backupService.backupDir}`);
  });
}

startApp().catch(console.error);

module.exports = app;