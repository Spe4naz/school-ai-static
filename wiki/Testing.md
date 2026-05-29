# Тестирование

Инструкция по запуску и написанию тестов для проекта School AI.

---

## Обзор

- **Фреймворк**: Jest
- **HTTP-тесты**: Supertest
- **БД для тестов**: Testcontainers (реальный PostgreSQL в Docker)
- **Покрытие**: branches, functions, lines, statements (мин. 20%)

---

## Запуск тестов

```bash
# Все тесты
npm test

# Watch-режим
npm run test:watch

# С покрытием
npm run test:coverage

# CI-режим
npm run test:ci

# Без вывода в консоль
npm run test:silent
```

---

## Структура тестов

```
__tests__/
├── globalSetup.js        # Запуск PostgreSQL контейнера
├── globalTeardown.js     # Остановка контейнера
├── setup.js              # Инициализация БД для каждого тест-сьюты
├── api.test.js           # Интеграционные тесты API
├── middleware.test.js    # Юнит-тесты middleware
├── services.test.js      # Юнит-тесты сервисов
├── services-extra.test.js  # Доп. тесты сервисов
├── unit.test.js          # Юнит-тесты утилит
└── __mocks__/
    └── email.js          # Мок SMTP-транспорта
```

---

## Как работают тесты

### 1. Global Setup

Запускает PostgreSQL контейнер через testcontainers:

```javascript
// globalSetup.js
const { PostgreSqlContainer } = require('@testcontainers/postgresql');
const container = await new PostgreSqlContainer().start();
// Сохраняет URL в .container-state.json
```

### 2. Per-Suite Setup

Для каждого тест-сьюты:
- Читает URL контейнера
- Инициализирует БД (создаёт таблицы, индексы, seed data)
- Записывает объект БД в `global.__DB__`

### 3. Тесты

Используют `supertest` для HTTP-запросов к Express-приложению.

### 4. Per-Suite Teardown

Удаляет все таблицы, закрывает соединение.

### 5. Global Teardown

Останавливает Docker-контейнер.

---

## Примеры тестов

### Интеграционный тест API

```javascript
// api.test.js
describe('Auth', () => {
  it('should login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: 'admin@school.ru', password: '123456' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.role).toBe('admin');
    // Токены установлены как httpOnly cookies
  });

  it('should reject invalid password', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: 'admin@school.ru', password: 'wrong' });

    expect(res.status).toBe(401);
  });
});
```

### Юнит-тест middleware

```javascript
// middleware.test.js
describe('auth middleware', () => {
  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/profile');
    expect(res.status).toBe(401);
  });

  it('should pass valid token', async () => {
    const token = jwt.sign({ id: '1', role: 'admin' }, JWT_SECRET);
    const res = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });
});
```

### Юнит-тест сервиса

```javascript
// services.test.js
describe('CryptoService', () => {
  it('should encrypt and decrypt', () => {
    const key = cryptoService.generateKey();
    const encrypted = cryptoService.encrypt('hello', key);
    const decrypted = cryptoService.decrypt(encrypted, key);
    expect(decrypted).toBe('hello');
  });

  it('should fail with wrong key', () => {
    const key1 = cryptoService.generateKey();
    const key2 = cryptoService.generateKey();
    const encrypted = cryptoService.encrypt('hello', key1);
    const result = cryptoService.decrypt(encrypted, key2);
    expect(result).toContain('error');
  });
});
```

---

## Что тестируется

### api.test.js (интеграционные)

- Login (все роли, неверные данные)
- Публичные эндпоинты (classes, health)
- Защищённые эндпоинты (без токена, с токеном)
- Расписание (CRUD)
- Уведомления (список, unread, mark-read, SSE)
- Чат (сообщения, загрузка, шифрование)
- Отчёты (PDF, Excel)
- Регистрация (ученик, учитель с кодом, неверный код)
- Создание оценок
- Сброс пароля (полный цикл)
- Смена пароля
- Выход
- Валидация Zod
- 404 для неизвестных путей

### middleware.test.js

- auth (нет токена, валидный, истёкший, невалидный)
- roles (доступ разрешён, запрещён, нет пользователя)
- validate (login, register, grade схемы)
- errorHandler (unique violation, validation, JWT, generic)

### services.test.js

- CryptoService (генерация ключа, encrypt/decrypt, неверный ключ, hash)
- NotificationService (create, list, markAsRead, unreadCount)
- GradeService (getStats распределение, пустой класс, getProgress, getSubjects)

### services-extra.test.js

- AdminService (listClasses, listStudents, listUsers, getStats, self-deletion)
- ScheduleService (list, create)
- asyncHandler (catch error, success)

### unit.test.js

- AppError (constructor, instanceof, stack)
- BackupService (constructor, default retention)

---

## Конфигурация Jest

Файл: `jest.config.js`

```javascript
module.exports = {
  testEnvironment: 'node',
  globalSetup: './__tests__/globalSetup.js',
  globalTeardown: './__tests__/globalTeardown.js',
  testTimeout: 30000,
  maxWorkers: 1,
  collectCoverageFrom: [
    'config/**/*.ts',
    'middleware/**/*.ts',
    'routes/**/*.ts',
    'services/**/*.ts',
    'server.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 20,
      lines: 20,
      statements: 20,
    },
  },
};
```

---

## Написание новых тестов

### Шаблон

```javascript
const request = require('supertest');
const app = require('../server');
const { setupTestDB, teardownTestDB } = require('./setup');

let db;

beforeAll(async () => {
  db = await setupTestDB();
});

afterAll(async () => {
  await teardownTestDB();
});

describe('My Feature', () => {
  let agent;

  beforeAll(async () => {
    agent = request.agent(app);
    await agent
      .post('/api/login')
      .send({ email: 'admin@school.ru', password: '123456' });
  });

  it('should do something', async () => {
    const res = await agent
      .get('/api/my-endpoint');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
  });
});
```

### Советы

- Используйте `request.agent(app)` для сохранения cookies между запросами
- Каждый тест должен быть независимым (не зависит от других)
- Используйте `describe` для группировки по функциональности
- Тестируйте как успех, так и ошибки
- Используйте `global.__DB__` для прямых запросов к БД в тестах
- Bearer-авторизация по-прежнему поддерживается для тестирования API-клиентов
