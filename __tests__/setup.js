// __tests__/setup.js
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgresql://school:school_pass@localhost:5432/school_test';
process.env.JWT_SECRET = 'test_jwt_secret_for_jest_only';

const { Pool } = require('pg');

async function createTestDatabase() {
  const testDbUrl = process.env.DATABASE_URL;
  const defaultUrl = testDbUrl.replace(/\/[^/]+$/, '/postgres');
  const dbName = testDbUrl.split('/').pop();

  const pool = new Pool({ connectionString: defaultUrl });
  try {
    const { rows } = await pool.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
    if (rows.length === 0) {
      await pool.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Created test database: ${dbName}`);
    }
  } finally {
    await pool.end();
  }
}

const db = require('../config/database');

beforeAll(async () => {
  console.log('Setting up test database...');
  await createTestDatabase();
  await db.init();
}, 30000);

afterAll(async () => {
  console.log('Cleaning up after tests...');
  const tables = ['class_keys', 'messages', 'logs', 'notifications', 'schedule', 'grades', 'users', 'classes', 'registration_codes', 'homeworks', 'announcements', 'chat_typing'];
  for (const t of tables) {
    try {
      await db.query(`DROP TABLE IF EXISTS ${t} CASCADE`);
    } catch (_) {}
  }
  await db.close();
});
