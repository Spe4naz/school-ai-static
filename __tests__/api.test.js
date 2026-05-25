const request = require('supertest');
const app = require('../server');

const tokens = {};

async function login(email, password) {
  const res = await request(app).post('/api/login').send({ email, password });
  return res.body.token;
}

beforeAll(async () => {
  tokens.admin = await login('admin@school.ru', '123456');
  tokens.student = await login('ivan@school.ru', '123456');
  tokens.teacher = await login('teacher@school.ru', '123456');
  tokens.parent = await login('parent@school.ru', '123456');
});

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

describe('Авторизация', () => {
  test('POST /api/login: успешный вход админа', async () => {
    const res = await request(app).post('/api/login').send({ email: 'admin@school.ru', password: '123456' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.role).toBe('admin');
  });

  test('POST /api/login: успешный вход ученика', async () => {
    const res = await request(app).post('/api/login').send({ email: 'ivan@school.ru', password: '123456' });
    expect(res.statusCode).toBe(200);
    expect(res.body.user.role).toBe('student');
  });

  test('POST /api/login: успешный вход учителя', async () => {
    const res = await request(app).post('/api/login').send({ email: 'teacher@school.ru', password: '123456' });
    expect(res.statusCode).toBe(200);
    expect(res.body.user.role).toBe('teacher');
  });

  test('POST /api/login: успешный вход родителя', async () => {
    const res = await request(app).post('/api/login').send({ email: 'parent@school.ru', password: '123456' });
    expect(res.statusCode).toBe(200);
    expect(res.body.user.role).toBe('parent');
  });

  test('POST /api/login: неверный пароль', async () => {
    const res = await request(app).post('/api/login').send({ email: 'admin@school.ru', password: 'wrong' });
    expect(res.statusCode).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  test('POST /api/login: неверный email', async () => {
    const res = await request(app).post('/api/login').send({ email: 'notanemail', password: '123456' });
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('INVALID_EMAIL');
  });

  test('POST /api/login: отсутствующие поля', async () => {
    const res = await request(app).post('/api/login').send({ email: 'test@school.ru' });
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('MISSING_FIELDS');
  });
});

describe('Публичные эндпоинты', () => {
  test('GET /api/classes: без токена → возвращает список', async () => {
    const res = await request(app).get('/api/classes');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('Защищённые роуты', () => {
  test('GET /api/grades: без токена → 401', async () => {
    const res = await request(app).get('/api/grades');
    expect(res.statusCode).toBe(401);
  });

  test('GET /api/schedule: без токена → 401', async () => {
    const res = await request(app).get('/api/schedule');
    expect(res.statusCode).toBe(401);
  });

  test('GET /api/classes: с токеном → 200', async () => {
    const res = await request(app).get('/api/classes').set(auth(tokens.admin));
    expect(res.statusCode).toBe(200);
  });

  test('GET /api/grades: с токеном ученика → возвращает оценки', async () => {
    const res = await request(app).get('/api/grades').set(auth(tokens.student));
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/students: только для teacher/admin', async () => {
    const res = await request(app).get('/api/students').set(auth(tokens.student));
    expect(res.statusCode).toBe(403);

    const res2 = await request(app).get('/api/students').set(auth(tokens.teacher));
    expect(res2.statusCode).toBe(200);
  });

  test('GET /api/stats: только для admin', async () => {
    const res = await request(app).get('/api/stats').set(auth(tokens.student));
    expect(res.statusCode).toBe(403);

    const res2 = await request(app).get('/api/stats').set(auth(tokens.admin));
    expect(res2.statusCode).toBe(200);
    expect(res2.body).toHaveProperty('totalUsers');
    expect(res2.body).toHaveProperty('totalGrades');
  });

  test('невалидный токен → 403', async () => {
    const res = await request(app).get('/api/grades').set('Authorization', 'Bearer invalid.token.here');
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('TOKEN_INVALID');
  });
});

describe('Расписание (schedule)', () => {
  test('GET /api/schedule: ученик получает своё расписание', async () => {
    const res = await request(app).get('/api/schedule').set(auth(tokens.student));
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/schedule: учитель получает по class_id', async () => {
    const res = await request(app).get('/api/schedule').set(auth(tokens.teacher));
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('Уведомления (notifications)', () => {
  test('GET /api/notifications: возвращает список', async () => {
    const res = await request(app).get('/api/notifications').set(auth(tokens.student));
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/notifications/unread-count: возвращает число', async () => {
    const res = await request(app).get('/api/notifications/unread-count').set(auth(tokens.student));
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('unread');
    expect(typeof res.body.unread).toBe('number');
  });

  test('GET /api/notifications: без токена → 401', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.statusCode).toBe(401);
  });
});

describe('Графики успеваемости', () => {
  test('GET /api/grades/subjects: только для student/parent', async () => {
    const res = await request(app).get('/api/grades/subjects').set(auth(tokens.teacher));
    expect(res.statusCode).toBe(403);

    const res2 = await request(app).get('/api/grades/subjects').set(auth(tokens.student));
    expect(res2.statusCode).toBe(200);
    expect(Array.isArray(res2.body)).toBe(true);
  });

  test('GET /api/grades/progress: только для student/parent', async () => {
    const res = await request(app).get('/api/grades/progress?period=month').set(auth(tokens.student));
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('Чат', () => {
  test('GET /api/chat/messages: admin получает первый доступный класс', async () => {
    const res = await request(app).get('/api/chat/messages').set(auth(tokens.admin));
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('messages');
  });

  test('POST /api/chat/messages: отправка сообщения', async () => {
    const res = await request(app)
      .post('/api/chat/messages')
      .set(auth(tokens.student))
      .send({ content: 'Тестовое сообщение' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('content');
  });

  test('POST /api/chat/messages: пустое сообщение → ошибка', async () => {
    const res = await request(app).post('/api/chat/messages').set(auth(tokens.student)).send({ content: '   ' });
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('EMPTY_MESSAGE');
  });
});

describe('Экспорт отчётов', () => {
  test('GET /api/reports/export: только для teacher/admin', async () => {
    const res = await request(app).get('/api/reports/export?type=pdf').set(auth(tokens.student));
    expect(res.statusCode).toBe(403);

    const res2 = await request(app).get('/api/reports/export?type=pdf').set(auth(tokens.teacher));
    expect(res2.statusCode).toBe(200);
    expect(res2.headers['content-type']).toContain('pdf');
  });

  test('GET /api/reports/export: excel формат', async () => {
    const res = await request(app).get('/api/reports/export?type=excel').set(auth(tokens.teacher));
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheet');
  });

  test('GET /api/reports/export: неверный тип → 400', async () => {
    const res = await request(app).get('/api/reports/export?type=csv').set(auth(tokens.teacher));
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('INVALID_TYPE');
  });
});

describe('Регистрация', () => {
  const newUser = { email: 'newstudent@test.com', password: '123456', name: 'Новый', role: 'student', class_id: null };

  test('POST /api/register: валидация полей', async () => {
    const res = await request(app).post('/api/register').send({ email: 'test@test.com' });
    expect(res.statusCode).toBe(400);
  });

  test('POST /api/register: teacher без кода → MISSING_FIELDS', async () => {
    const res = await request(app).post('/api/register').send({
      email: 'newteacher@test.com',
      password: '123456',
      name: 'New Teacher',
      role: 'teacher',
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('MISSING_FIELDS');
  });

  test('POST /api/register: teacher с валидным кодом → 201', async () => {
    const res = await request(app).post('/api/register').send({
      email: 'codeteacher@test.com',
      password: '123456',
      name: 'Code Teacher',
      role: 'teacher',
      code: 'SCHOOL2024',
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/register: head_teacher с кодом → 201', async () => {
    const res = await request(app).post('/api/register').send({
      email: 'codehead@test.com',
      password: '123456',
      name: 'Code Head',
      role: 'head_teacher',
      code: 'HEAD01',
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/register: использованный код → 400', async () => {
    const res = await request(app).post('/api/register').send({
      email: 'reusedcode@test.com',
      password: '123456',
      name: 'Reused',
      role: 'teacher',
      code: 'SCHOOL2024',
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('INVALID_TOKEN');
  });

  test('POST /api/register: неверный email → 400', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ email: 'invalid', password: '123456', name: 'Тест', role: 'student' });
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('INVALID_EMAIL');
  });

  test('POST /api/register: успешная регистрация ученика', async () => {
    const classes = await request(app).get('/api/classes');
    const classId = classes.body[0]?.id;

    const res = await request(app)
      .post('/api/register')
      .send({ ...newUser, email: 'unique@test.com', class_id: classId });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/register: дубликат email → 409', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ ...newUser, email: 'ivan@school.ru' });
    expect(res.statusCode).toBe(409);
    expect(res.body.code).toBe('EMAIL_EXISTS');
  });
});

describe('Выставление оценок', () => {
  test('POST /api/grades: ученик не может выставлять → 403', async () => {
    const res = await request(app)
      .post('/api/grades')
      .set(auth(tokens.student))
      .send({ student_id: 'x', subject: 'Математика', grade: 4 });
    expect(res.statusCode).toBe(403);
  });

  test('POST /api/grades: неверная оценка → 400', async () => {
    const res = await request(app)
      .post('/api/grades')
      .set(auth(tokens.teacher))
      .send({ student_id: 'x', subject: 'Математика', grade: 6 });
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('INVALID_GRADE');
  });
});

describe('Сброс пароля', () => {
  test('POST /api/password-reset/request: защита от перебора', async () => {
    const res = await request(app).post('/api/password-reset/request').send({ email: 'nonexistent@test.com' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/password-reset/request: неверный email → 400', async () => {
    const res = await request(app).post('/api/password-reset/request').send({ email: 'invalid' });
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('INVALID_EMAIL');
  });

  test('POST /api/password-reset/confirm: неверный id → 400', async () => {
    const res = await request(app)
      .post('/api/password-reset/confirm')
      .send({ id: 'bad-reset-id', email: 'admin@school.ru', newPassword: 'newpass123' });
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('INVALID_TOKEN');
  });
});

describe('Обработка ошибок', () => {
  test('404 для несуществующего /api/ маршрута', async () => {
    const res = await request(app).get('/api/nonexistent-route');
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});
