const path = require('path');
const fs = require('fs');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_for_jest_only_32chars!';

const stateFile = path.join(__dirname, '.container-state.json');

beforeAll(async () => {
  const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  process.env.DATABASE_URL = state.databaseUrl;

  const db = require('../config/database');
  await db.init();
}, 60000);

afterAll(async () => {
  console.log('Cleaning up...');
  const db = require('../config/database');
  const tables = ['refresh_tokens', 'class_keys', 'messages', 'logs', 'notifications', 'schedule', 'grades', 'users', 'classes', 'registration_codes', 'homeworks', 'announcements', 'chat_typing'];
  for (const t of tables) {
    try { await db.query(`DROP TABLE IF EXISTS ${t} CASCADE`); } catch (_) {}
  }
  await db.close();
}, 30000);
