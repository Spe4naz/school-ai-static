# Тестирование

Jest + Supertest + testcontainers. 222 теста, покрытие мин. 50%.

---

## Запуск

```bash
npm run test            # Все тесты
npm run test:watch      # Watch-режим
npm run test:coverage   # С покрытием
npm run test:ci         # CI-режим
```

Требуется Docker (testcontainers запускает PostgreSQL).

---

## Структура тестов

| Файл | Тестов | Покрытие |
|------|--------|----------|
| `api.test.js` | 50 | Auth, register, CRUD, chat, reports, SSE, cookie auth, password complexity |
| `api-extended.test.js` | 58 | Setup wizard, System API (Docker, status, logs), Schedule CRUD, Grades create, Homework/Announcement delete, Notifications, Profile, Reports, Login case-insensitive |
| `middleware.test.js` | 33 | Auth (Bearer/cookie/precedence), roles, validate, errorHandler, requireAuth |
| `services.test.js` | 22 | Crypto, Notification, GradeService (SQL stats), Cache utility |
| `services-extra.test.js` | 33 | AdminService (cache invalidation), ScheduleService (cache), UserService, ChatService, Homework, Announcement, asyncHandler, DockerService |
| `unit.test.js` | 28 | AppError, BackupService (_safePath + null bytes), Cache utility, DockerService |

---

## Что тестируется

### api.test.js

- Health check (status ok, без uptime)
- Login (все роли, cookie auth, token не в body, неверные данные, case-insensitive email)
- Регистрация (ученик, учитель с кодом, неверный код, дубликат email, parent linked_student_email)
- Публичные эндпоинты (classes)
- Защищённые эндпоинты (grades, schedule, students, stats)
- Профиль (данные без password, разные роли)
- Чат (сообщения, ключ, участники)
- Домашние задания (CRUD, delete)
- Объявления (CRUD, delete)
- Отчёты (PDF, Excel, с class_id)
- Оценки (create success, roles, валидация)
- Сброс пароля (неизвестный email, неверный id)
- Смена пароля (успех, неверный пароль, без токена, сложность)
- Выход (с refresh-токеном, без)
- Refresh token (без токена, невалидный)
- 404 для неизвестных путей

### api-extended.test.js

- Setup wizard (status, config, apply validation, generate-secret)
- System API (status, containers, config, logs, backups — admin only)
- Schedule CRUD (create, delete, student → 403)
- Grades create (teacher success)
- Homework/Announcement delete (non-existent → 404, teacher → 403)
- Notifications mark-as-read
- Reports с class_id
- Login case-insensitive
- Parent linked_student_email

### services-extra.test.js

- AdminService (cache hit/invalidation, CRUD, settings, logs)
- ScheduleService (cache, create invalidates cache)
- UserService (findByEmail, findById, createRefreshToken, consumeRefreshToken, invalidateAllRefreshTokens, getProfile, validateRegistrationCode)
- ChatService (getOrCreateClassKey idempotent, clearStaleTyping)
- DockerService (isAvailable, getDockerInfo, getContainers, getContainer non-existent)
- asyncHandler

### unit.test.js

- AppError (create, instanceof, stack, throw/catch)
- BackupService (constructor, defaults, _safePath: .., /, \, null bytes, valid)
- Cache utility (set/get, missing, expired, invalidate, invalidatePrefix, TTL, complex objects, overwrite, null, undefined, empty string, zero, false)
- DockerService (isAvailable, getDockerInfo, getContainers, getContainer)

---

## Написание новых тестов

```javascript
const request = require('supertest');
const app = require('../server');

function extractToken(res) {
  const setCookie = res.headers['set-cookie'] || [];
  const tokenCookie = setCookie.find(c => c.startsWith('token='));
  return tokenCookie ? tokenCookie.split(';')[0].split('=').slice(1).join('=') : null;
}

describe('My Feature', () => {
  let token;

  beforeAll(async () => {
    const res = await request(app).post('/api/login')
      .send({ email: 'admin@school.ru', password: '123456' });
    token = extractToken(res);
  });

  it('should work', async () => {
    const res = await request(app).get('/api/my-endpoint')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
```

---

## Конфигурация Jest

```javascript
module.exports = {
  testEnvironment: 'node',
  globalSetup: './__tests__/globalSetup.js',
  globalTeardown: './__tests__/globalTeardown.js',
  testTimeout: 30000,
  maxWorkers: 1,
  coverageThreshold: {
    global: { branches: 50, functions: 50, lines: 50, statements: 50 }
  }
};
```
