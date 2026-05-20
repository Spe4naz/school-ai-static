// __tests__/setup.js
const path = require('path');
const fs = require('fs').promises; // Используем async fs

// === Настройка окружения для тестов ===
process.env.NODE_ENV = 'test';
process.env.DB_PATH = path.join(__dirname, 'test.db');
process.env.JWT_SECRET = 'test_jwt_secret_for_jest_only';
process.env.SKIP_DEV_EMAIL = 'true';

// === Импорты ===
const db = require('../config/database');

// === Глобальные хуки ===
beforeAll(async () => {
  console.log('🔧 Настройка тестового окружения...');
  
  // 1. Закрываем любое существующее соединение и удаляем старую БД
  if (db.db) {
    await new Promise((resolve) => db.db.close(resolve));
  }
  
  const dbPath = process.env.DB_PATH;
  try {
    if (await fs.access(dbPath).then(() => true).catch(() => false)) {
      await fs.unlink(dbPath);
      console.log(`🗑️ Удалён старый test.db`);
    }
  } catch (err) {
    // Игнорируем, если файл не существует
  }
  
  // 2. Инициализируем НОВУЮ БД
  // Создаём новый экземпляр database для тестов
  const TestDatabase = require('../config/database').constructor;
  const testDb = new TestDatabase();
  testDb.db = require('sqlite3').verbose().Database(dbPath);
  testDb.run = require('util').promisify(testDb.db.run).bind(testDb.db);
  testDb.all = require('util').promisify(testDb.db.all).bind(testDb.db);
  testDb.get = require('util').promisify(testDb.db.get).bind(testDb.db);
  
  await testDb.init();
  
  // Заменяем экспортированный db на тестовый
  Object.assign(require('../config/database'), testDb);
  
  console.log('✅ Тестовая БД инициализирована');
}, 30000); // Таймаут 30 секунд на инициализацию

afterAll(async () => {
  console.log('🧹 Очистка после тестов...');
  
  // Закрываем соединение
  if (db.db) {
    await new Promise((resolve) => db.db.close(resolve));
  }
  
  // Удаляем файл БД с повторными попытками (для Windows)
  const dbPath = process.env.DB_PATH;
  for (let i = 0; i < 5; i++) {
    try {
      if (await fs.access(dbPath).then(() => true).catch(() => false)) {
        await fs.unlink(dbPath);
        console.log('🗑️ Тестовая БД удалена');
      }
      break;
    } catch (err) {
      if (i === 4) {
        console.warn('⚠️ Не удалось удалить test.db:', err.message);
      } else {
        // Ждём и пробуем снова (для Windows, где файл может быть заблокирован)
        await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
      }
    }
  }
});