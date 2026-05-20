// __tests__/api.test.js
const request = require('supertest');
const app = require('../server');
const db = require('../config/database');

describe('🔐 Базовая авторизация', () => {
  test('POST /api/login: успешный вход админа', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: 'admin@school.ru', password: '123456' });
    
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.role).toBe('admin');
  });

  test('POST /api/login: неверный пароль', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: 'admin@school.ru', password: 'wrong_password' });
    
    expect(res.statusCode).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  test('POST /api/login: отсутствующие поля', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: 'test@school.ru' });
    
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('MISSING_FIELDS');
  });
});

describe('📚 Базовые роуты', () => {
  let adminToken;

  beforeAll(async () => {
    // Получаем токен админа для тестов
    const res = await request(app)
      .post('/api/login')
      .send({ email: 'admin@school.ru', password: '123456' });
    adminToken = res.body.token;
  });

  test('GET /api/classes: возврат списка (с токеном)', async () => {
    const res = await request(app)
      .get('/api/classes')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/classes: без токена → 401', async () => {
    const res = await request(app).get('/api/classes');
    expect(res.statusCode).toBe(401);
  });

  test('GET /api/grades: без токена → 401', async () => {
    const res = await request(app).get('/api/grades');
    expect(res.statusCode).toBe(401);
  });
});

describe('❌ Обработка ошибок', () => {
  test('404 для несуществующего маршрута', async () => {
    const res = await request(app).get('/api/nonexistent-route');
    expect(res.statusCode).toBe(404);
  });
});