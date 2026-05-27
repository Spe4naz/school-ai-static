// __tests__/setup.js
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_for_jest_only';

const { GenericContainer } = require('testcontainers');

let container;

beforeAll(async () => {
  console.log('Starting PostgreSQL container...');
  container = await new GenericContainer('postgres:16-alpine')
    .withEnvironment({
      POSTGRES_DB: 'school_test',
      POSTGRES_USER: 'test',
      POSTGRES_PASSWORD: 'test_pass',
    })
    .withExposedPorts(5432)
    .withHealthCheck({
      test: ['CMD-SHELL', 'pg_isready -U test -d school_test'],
      interval: 1000,
      retries: 10,
    })
    .start();

  const host = container.getHost();
  const port = container.getMappedPort(5432);
  process.env.DATABASE_URL = `postgresql://test:test_pass@${host}:${port}/school_test`;
  console.log('PostgreSQL ready at', process.env.DATABASE_URL);

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
  if (container) await container.stop();
}, 30000);
