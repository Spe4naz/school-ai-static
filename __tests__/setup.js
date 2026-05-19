// __tests__/setup.js
const { initDB, db } = require('../db');
const path = require('path');

// Указываем тестовую БД
process.env.DB_PATH = path.join(__dirname, 'test.db');
process.env.JWT_SECRET = 'test_secret';

beforeAll(async () => {
  await initDB();
});

afterAll((done) => {
  db.close(done);
  const fs = require('fs');
  if (fs.existsSync(process.env.DB_PATH)) fs.unlinkSync(process.env.DB_PATH);
});