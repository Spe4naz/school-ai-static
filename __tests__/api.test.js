// __tests__/api.test.js
const request = require('supertest');
const app = require('../server');
const { db } = require('../db');

let adminToken, studentToken, parentToken, teacherToken;
let studentId, teacherId;

beforeAll(async () => {
  // Получаем токены из сидов
  const login = async (email) => {
    const res = await request(app).post('/api/login').send({ email, password: '123456' });
    return res.body.token;
  };
  adminToken = await login('admin@school.ru');
  studentToken = await login('student@school.ru');
  teacherToken = await login('teacher@school.ru');
  parentToken = await login('parent@school.ru');

  const stu = await new Promise((r) => db.get("SELECT id FROM users WHERE email='student@school.ru'", (_, row) => r(row)));
  const tch = await new Promise((r) => db.get("SELECT id FROM users WHERE email='teacher@school.ru'", (_, row) => r(row)));
  studentId = stu.id; teacherId = tch.id;
});

describe('🔐 Авторизация и Регистрация', () => {
  test('POST /api/login: успешный вход', async () => {
    const res = await request(app).post('/api/login').send({ email: 'admin@school.ru', password: '123456' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  test('POST /api/login: неверный пароль', async () => {
    const res = await request(app).post('/api/login').send({ email: 'admin@school.ru', password: 'wrong' });
    expect(res.statusCode).toBe(401);
  });

  test('POST /api/register: новый ученик', async () => {
    const res = await request(app).post('/api/register').send({
      name: 'Тест Ученик', email: 'new@school.ru', password: '123456', role: 'student', class_id: '10Б'
    });
    expect(res.statusCode).toBe(201);
  });

  test('POST /api/register: дубликат email', async () => {
    const res = await request(app).post('/api/register').send({
      name: 'Дубль', email: 'new@school.ru', password: '123456', role: 'student'
    });
    expect(res.statusCode).toBe(409);
  });
});

describe('📊 Оценки и Роли', () => {
  test('GET /api/grades: ученик видит только свои', async () => {
    const res = await request(app).get('/api/grades').set('Authorization', `Bearer ${studentToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeArray();
    expect(res.body[0].student_id).toBe(studentId);
  });

  test('POST /api/grades: учитель ставит оценку', async () => {
    const res = await request(app).post('/api/grades').set('Authorization', `Bearer ${teacherToken}`)
      .send({ student_id: studentId, subject: 'Информатика', grade: 5, comment: 'Код работает' });
    expect(res.statusCode).toBe(200);
  });

  test('POST /api/grades: ученик НЕ может ставить оценки', async () => {
    const res = await request(app).post('/api/grades').set('Authorization', `Bearer ${studentToken}`)
      .send({ student_id: studentId, subject: 'Химия', grade: 3 });
    expect(res.statusCode).toBe(403);
  });
});

describe('📜 Логи (Админ)', () => {
  test('GET /api/logs: админ видит журнал', async () => {
    const res = await request(app).get('/api/logs').set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('user_name');
    expect(res.body[0]).toHaveProperty('action');
  });

  test('GET /api/logs: учитель НЕ видит логи', async () => {
    const res = await request(app).get('/api/logs').set('Authorization', `Bearer ${teacherToken}`);
    expect(res.statusCode).toBe(403);
  });
});

describe('👨‍👩‍👧 Родительский доступ', () => {
  test('GET /api/parent/dashboard: данные ребёнка', async () => {
    const res = await request(app).get('/api/parent/dashboard').set('Authorization', `Bearer ${parentToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.child).toHaveProperty('name');
    expect(res.body.grades).toBeArray();
  });
});