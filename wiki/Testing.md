# Тестирование

Jest + Supertest + testcontainers. 164 теста, покрытие мин. 50%.

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
| `api.test.js` | 50 | Auth, register, CRUD, chat, reports, SSE, cookie auth, password complexity, refresh token |
| `middleware.test.js` | 33 | Auth (Bearer/cookie/precedence), roles, validate, errorHandler, requireAuth |
| `services.test.js` | 22 | Crypto, Notification, GradeService (SQL stats), Cache utility |
| `services-extra.test.js` | | AdminService (кэш), ScheduleService, Homework, Announcement, asyncHandler |
| `unit.test.js` | 20 | AppError, BackupService (_safePath), Cache utility |

---

## Что тестируется

### api.test.js

- Health check (status ok, без uptime)
- Login (все роли, cookie auth, token не в body, неверные данные)
- Регистрация (ученик, учитель с кодом, неверный код, дубликат email)
- Публичные эндпоинты (classes)
- Защищённые эндпоинты (grades, schedule, students, stats)
- Профиль (данные без password)
- Чат (сообщения, ключ, участники)
- Домашние задания (CRUD)
- Объявления (CRUD)
- Отчёты (PDF, Excel, неверный тип)
- Оценки (roles, валидация)
- Сброс пароля (неизвестный email, неверный id)
- Смена пароля (успех, неверный пароль, без токена, сложность)
- Выход (с refresh-токеном, без)
- Refresh token (без токена, невалидный)
- 404 для неизвестных путей

### middleware.test.js

- Auth (нет токена, Bearer, cookie, приоритет Bearer > cookie, истёкший, невалидный)
- Roles (разрешён, запрещён, нет пользователя, несколько ролей)
- Validate (login, register, grade схемы, email normalisation, html sanitization)
- ErrorHandler (23505, AppError, ValidationError, JsonWebTokenError, generic, dev mode)
- RequireAuth factory

### services.test.js

- CryptoService (generateKey, roundtrip, wrong key, invalid format, hash, unicode, empty)
- NotificationService (create, list, markAsRead, unreadCount, limit)
- GradeService (getStats SQL, empty class, getProgress, getSubjects)
- Cache utility (set/get, expired, invalidate, invalidatePrefix, TTL, complex objects, overwrite)

### services-extra.test.js

- AdminService (listClasses + cache, listStudents, listUsers + filter + search, getStats, deleteUser, createClass, getSettings, listRegistrationCodes, listLogs)
- ScheduleService (list admin/teacher, cache, create)
- HomeworkService (list, create)
- AnnouncementService (list, create)
- asyncHandler (error catch, success, sync error)

### unit.test.js

- AppError (create, instanceof, stack, multiple)
- BackupService (constructor, defaults, _safePath traversal × 3, valid path)
- Cache utility (set/get, missing, expired, invalidate, invalidatePrefix, TTL values, complex objects, overwrite)

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
// jest.config.js
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
