const request = require('supertest');
const app = require('../server');
const fs = require('fs');
const path = require('path');

function extractToken(res) {
  const setCookie = res.headers['set-cookie'] || [];
  const tokenCookie = setCookie.find((c) => c.startsWith('token='));
  if (!tokenCookie) return null;
  return tokenCookie.split(';')[0].split('=').slice(1).join('=');
}

async function loginAsAdmin() {
  const res = await request(app).post('/api/login').send({ email: 'admin@school.ru', password: '123456' });
  return extractToken(res);
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

describe('Setup Wizard', () => {
  test('GET /api/setup/status: returns complete status', async () => {
    const res = await request(app).get('/api/setup/status');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('complete');
    expect(typeof res.body.complete).toBe('boolean');
  });

  test('GET /api/setup/config: returns current config', async () => {
    const res = await request(app).get('/api/setup/config');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('domain');
    expect(res.body).toHaveProperty('port');
    expect(res.body).toHaveProperty('nodeEnv');
  });

  test('POST /api/setup/apply: validates required fields', async () => {
    const res = await request(app).post('/api/setup/apply').send({});
    expect(res.statusCode).toBe(400);
  });

  test('POST /api/setup/apply: validates email format', async () => {
    const res = await request(app).post('/api/setup/apply').send({
      domain: 'test.com',
      port: '3000',
      adminName: 'Admin',
      adminEmail: 'notanemail',
      adminPassword: 'SecurePass1',
    });
    expect(res.statusCode).toBe(400);
  });

  test('POST /api/setup/apply: validates password complexity', async () => {
    const res = await request(app).post('/api/setup/apply').send({
      domain: 'test.com',
      port: '3000',
      adminName: 'Admin',
      adminEmail: 'admin@test.com',
      adminPassword: '123',
    });
    expect(res.statusCode).toBe(400);
  });

  test('GET /api/setup/generate-secret: returns hex string', async () => {
    const res = await request(app).get('/api/setup/generate-secret');
    expect(res.statusCode).toBe(200);
    expect(res.body.secret).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('System API (admin only)', () => {
  let adminToken;

  beforeAll(async () => {
    adminToken = await loginAsAdmin();
  });

  test('GET /api/system/status: admin → 200', async () => {
    const res = await request(app).get('/api/system/status').set(auth(adminToken));
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('server');
    expect(res.body).toHaveProperty('system');
    expect(res.body).toHaveProperty('database');
    expect(res.body).toHaveProperty('docker');
    expect(res.body).toHaveProperty('containers');
    expect(res.body.server).toHaveProperty('uptime');
    expect(res.body.server).toHaveProperty('nodeVersion');
    expect(res.body.system).toHaveProperty('cpus');
    expect(res.body.system).toHaveProperty('totalMemory');
  });

  test('GET /api/system/status: student → 403', async () => {
    const studentRes = await request(app).post('/api/login').send({ email: 'ivan@school.ru', password: '123456' });
    const studentToken = extractToken(studentRes);
    const res = await request(app).get('/api/system/status').set(auth(studentToken));
    expect(res.statusCode).toBe(403);
  });

  test('GET /api/system/containers: admin → 200', async () => {
    const res = await request(app).get('/api/system/containers').set(auth(adminToken));
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/system/config: admin → 200 (masked)', async () => {
    const res = await request(app).get('/api/system/config').set(auth(adminToken));
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('nodeEnv');
    expect(res.body).toHaveProperty('jwtSecretSet');
    expect(typeof res.body.jwtSecretSet).toBe('boolean');
  });

  test('GET /api/system/logs: admin → 200', async () => {
    const res = await request(app).get('/api/system/logs?lines=10').set(auth(adminToken));
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('logs');
  });

  test('GET /api/system/backups: admin → 200', async () => {
    const res = await request(app).get('/api/system/backups').set(auth(adminToken));
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('Extended API Coverage', () => {
  let adminToken, teacherToken, studentToken;

  beforeAll(async () => {
    adminToken = await loginAsAdmin();
    const teacherRes = await request(app).post('/api/login').send({ email: 'teacher@school.ru', password: '123456' });
    teacherToken = extractToken(teacherRes);
    const studentRes = await request(app).post('/api/login').send({ email: 'ivan@school.ru', password: '123456' });
    studentToken = extractToken(studentRes);
  });

  // Schedule CRUD
  test('POST /api/schedule: teacher creates schedule', async () => {
    const classes = await request(app).get('/api/classes').set(auth(teacherToken));
    const classId = classes.body[0]?.id;
    if (!classId) return;

    const res = await request(app)
      .post('/api/schedule')
      .set(auth(teacherToken))
      .send({ day: 'Пн', time_slot: '12:45', subject: 'Тест', class_id: classId, room: '101' });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/schedule: student → 403', async () => {
    const res = await request(app)
      .post('/api/schedule')
      .set(auth(studentToken))
      .send({ day: 'Пн', time_slot: '12:45', subject: 'Тест', class_id: 'x' });
    expect(res.statusCode).toBe(403);
  });

  test('DELETE /api/schedule/:id: non-existent → error', async () => {
    const res = await request(app).delete('/api/schedule/99999').set(auth(adminToken));
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  // Grades create success
  test('POST /api/grades: teacher creates grade', async () => {
    const students = await request(app).get('/api/students').set(auth(teacherToken));
    const studentId = students.body[0]?.id;
    if (!studentId) return;

    const res = await request(app)
      .post('/api/grades')
      .set(auth(teacherToken))
      .send({ student_id: studentId, subject: 'Тест', grade: 5, comment: 'Тестовая оценка' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.grade).toHaveProperty('student_id');
    expect(res.body.grade).toHaveProperty('subject', 'Тест');
  });

  // Homework delete
  test('DELETE /api/homework/:id: non-existent → 404', async () => {
    const res = await request(app).delete('/api/homework/99999').set(auth(teacherToken));
    expect(res.statusCode).toBe(404);
  });

  test('DELETE /api/homework/:id: student → 403', async () => {
    const res = await request(app).delete('/api/homework/1').set(auth(studentToken));
    expect(res.statusCode).toBe(403);
  });

  // Announcements delete
  test('DELETE /api/announcements/:id: non-existent → 404', async () => {
    const res = await request(app).delete('/api/announcements/99999').set(auth(adminToken));
    expect(res.statusCode).toBe(404);
  });

  test('DELETE /api/announcements/:id: teacher → 403', async () => {
    const res = await request(app).delete('/api/announcements/1').set(auth(teacherToken));
    expect(res.statusCode).toBe(403);
  });

  // Notifications mark-as-read
  test('PUT /api/notifications/read: marks all as read', async () => {
    const res = await request(app).put('/api/notifications/read').set(auth(studentToken));
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // Profile for different roles
  test('GET /api/profile: student returns correct role', async () => {
    const res = await request(app).get('/api/profile').set(auth(studentToken));
    expect(res.statusCode).toBe(200);
    expect(res.body.role).toBe('student');
  });

  test('GET /api/profile: teacher returns correct role', async () => {
    const res = await request(app).get('/api/profile').set(auth(teacherToken));
    expect(res.statusCode).toBe(200);
    expect(res.body.role).toBe('teacher');
  });

  // Grades stats
  test('GET /api/grades/stats: teacher → 200', async () => {
    const classes = await request(app).get('/api/classes').set(auth(teacherToken));
    const classId = classes.body[0]?.id;
    if (!classId) return;

    const res = await request(app).get(`/api/grades/stats?class_id=${classId}`).set(auth(teacherToken));
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('average');
    expect(res.body).toHaveProperty('count');
    expect(res.body).toHaveProperty('distribution');
  });

  // Chat delete message
  test('DELETE /api/chat/messages/:id: non-existent → 404', async () => {
    const res = await request(app).delete('/api/chat/messages/99999').set(auth(studentToken));
    expect(res.statusCode).toBe(404);
  });

  // Reports with class_id
  test('GET /api/reports/export: with class_id → 200', async () => {
    const classes = await request(app).get('/api/classes').set(auth(teacherToken));
    const classId = classes.body[0]?.id;
    if (!classId) return;

    const res = await request(app).get(`/api/reports/export?type=pdf&class_id=${classId}`).set(auth(teacherToken));
    expect(res.statusCode).toBe(200);
  });

  // Login with email normalization
  test('POST /api/login: email case-insensitive', async () => {
    const res = await request(app).post('/api/login').send({ email: 'ADMIN@SCHOOL.RU', password: '123456' });
    expect(res.statusCode).toBe(200);
    expect(res.body.user.role).toBe('admin');
  });

  // Registration with parent linked_student_email
  test('POST /api/register: parent with linked_student_email', async () => {
    const res = await request(app).post('/api/register').send({
      email: 'parentlink@test.com',
      password: 'SecurePass1',
      name: 'Parent Link',
      role: 'parent',
      student_email: 'ivan@school.ru',
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });
});
