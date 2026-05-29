# Архитектура проекта

Обзор структуры кода, взаимодействия модулей и принятых решений.

---

## Общая схема

```
┌─────────────────────────────────────────────────────┐
│                     КЛИЕНТ                          │
│  (Браузер: dashboard.html / admin-panel.html)       │
│  Vanilla JS + Web Crypto API (шифрование чата)      │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP / SSE
                       ▼
┌─────────────────────────────────────────────────────┐
│                    CADDY                            │
│  Reverse proxy, авто-SSL, безопасные заголовки     │
└──────────────────────┬──────────────────────────────┘
                       │ :3000
                       ▼
┌─────────────────────────────────────────────────────┐
│               EXPRESS SERVER (server.ts)             │
│                                                     │
│  Middleware:                                         │
│  ┌─────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ Helmet  │ │ Logger │ │RateLimit │ │Compress  │ │CSPNonce│ │
│  │(+nonce) │ │        │ │(IP+user) │ │          │ │        │ │
│  └─────────┘ └────────┘ └──────────┘ └──────────┘ └────────┘ │
│                                                     │
│  Auth Middleware:                                    │
│  ┌────────┐ ┌───────┐ ┌────────────┐ ┌─────────┐  │
│  │  JWT   │ │ Roles │ │  Validate  │ │Resolve  │  │
│  │        │ │       │ │  (Zod)     │ │StudentId│  │
│  └────────┘ └───────┘ └────────────┘ └─────────┘  │
│                                                     │
│  Routes:                                            │
│  ┌──────┐ ┌──────┐ ┌───────┐ ┌──────┐ ┌────────┐  │
│  │ Auth │ │Grade │ │Schedule│ │ Chat │ │  Admin │  │
│  └──────┘ └──────┘ └───────┘ └──────┘ └────────┘  │
│  ┌────────┐ ┌───────┐ ┌──────────┐ ┌────────────┐ │
│  │Homework│ │Notif. │ │Announce. │ │  Reports   │ │
│  └────────┘ └───────┘ └──────────┘ └────────────┘ │
│                                                     │
│  Services (бизнес-логика):                          │
│  ┌──────────┐ ┌───────────┐ ┌──────────────────┐  │
│  │ UserService│ │GradeService│ │NotificationSvc  │  │
│  └──────────┘ └───────────┘ └──────────────────┘  │
│  ┌──────────┐ ┌───────────┐ ┌──────────────────┐  │
│  │ChatService│ │ScheduleSvc│ │   AdminService   │  │
│  └──────────┘ └───────────┘ └──────────────────┘  │
│  ┌──────────┐ ┌───────────┐ ┌──────────────────┐  │
│  │CryptoSvc │ │BackupSvc  │ │  ReportService   │  │
│  └──────────┘ └───────────┘ └──────────────────┘  │
│                                                     │
│  Config (container.ts = DI):                        │
│  ┌─────────────────────────────────────────────┐   │
│  │  Singleton instances, dependency injection   │   │
│  └─────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────┘
                       │ SQL (pg Pool)
                       ▼
┌─────────────────────────────────────────────────────┐
│                  PostgreSQL 16                       │
│  users, grades, schedule, messages, homeworks,      │
│  notifications, announcements, logs, etc.           │
└─────────────────────────────────────────────────────┘
```

---

## Структура директорий

```
school-ai-static/
├── config/              # Конфигурация (БД, auth, email, DI container)
├── middleware/           # Express middleware (auth, roles, validation, rate-limit)
├── routes/              # HTTP маршруты (контроллеры)
├── services/            # Бизнес-логика
├── utils/               # Вспомогательные функции (AppError, classResolver)
├── scripts/             # Скрипты разработки (dev.js)
├── public/              # Статика + фронтенд
│   ├── *.html           # Страницы (login, register, dashboard, admin)
│   ├── js/              # Фронтенд модули (ES Modules)
│   ├── style.css        # Глобальные стили
│   └── uploads/         # Загруженные изображения (чат)
├── __tests__/           # Тесты (Jest + Supertest + Testcontainers)
├── server.ts            # Точка входа сервера
├── Dockerfile           # Продакшн Docker-образ
├── docker-compose.yml   # Docker Compose (продакшн)
└── Caddyfile            # Конфигурация Caddy proxy
```

---

## Конфигурация и DI-контейнер

Все сервисы создаются как **синглтоны** в `config/container.ts` и связываются через dependency injection:

```typescript
// config/container.ts
cryptoService = new CryptoService()                    // standalone
notificationService = new NotificationService(db)      // db
backupService = new BackupService()                     // standalone
userService = new UserService(db)                       // db
gradeService = new GradeService(db, notificationService) // db + notificationService
chatService = new ChatService(db, cryptoService)        // db + cryptoService
reportService = new ReportService(db)                   // db
scheduleService = new ScheduleService(db)               // db
adminService = new AdminService(db)                     // db
homeworkService = new HomeworkService(db)               // db
announcementService = new AnnouncementService(db)       // db
```

---

## Middleware-пайплайн

Каждый запрос проходит через цепочку middleware:

```
Request
  │
  ▼
compression()          -- gzip сжатие
cookieParser()         -- парсинг cookies
cspNonce()             -- генерация nonce для CSP
helmet()               -- безопасные HTTP-заголовки (с nonces)
express.json()         -- парсинг JSON body (лимит 1MB)
logger()               -- логирование запросов
apiLimiter()           -- глобальный rate-limit (100 req/10min)
  │
  ▼
[Public route]  ИЛИ  [Auth middleware]  →  [Roles middleware]  →  [Validate middleware]
                                                              │
                                                              ▼
                                                         Route handler
                                                              │
                                                              ▼
                                                         Service method
                                                              │
                                                              ▼
                                                         Response (+ error handler)
```

---

## Поток данных: выставление оценки

Пример полного цикла работы системы:

```
1. Учитель отправляет POST /api/grades
   { student_id, subject, grade, comment }

2. Validate middleware проверяет Zod-схему
   - student_id обязателен
   - grade: число 2-5
   - subject: непустая строка

3. Auth middleware проверяет JWT
   - Роль: teacher или admin

4. Roles middleware проверяет доступ

5. GradeService.create():
   a. Вставляет запись в БД (grades)
   b. Логирует действие в logs
   c. NotificationService.createForGrade():
      - Создаёт уведомление ученику
      - Находит linked_student_id родителей
      - Создаёт уведомление родителю
      - Push через SSE обоим пользователям

6. Возвращается JSON с новой оценкой
```

---

## Ключевые архитектурные решения

### Без ORM -- прямые SQL-запросы

Проект использует `pg` Pool напрямую без ORM (Sequelize, Prisma и т.д.):

```typescript
// services/gradeService.ts
const result = await this.db.query(
  'INSERT INTO grades (student_id, teacher_id, subject, grade, comment) VALUES ($1, $2, $3, $4, $5) RETURNING *',
  [student_id, teacher_id, subject, grade, comment]
);
```

**Плюсы**: полный контроль над SQL, нет "магии" ORM, меньше зависимостей.
**Минусы**: больше ручной работы, нет типизации запросов.

### Миграции inline

Вместо отдельного инструмента миграций (Knex, Flyway) используется подход `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`:

```typescript
// config/database.ts
await this.pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT');
```

Миграции выполняются автоматически при старте сервера.

### SSE вместо WebSocket

Для реалтайм-уведомлений используется **Server-Sent Events** -- более простой протокол, не требующий дополнительных библиотек:

```
Клиент → GET /api/notifications/stream (long-lived connection)
Сервер → Отправляет event при новом уведомлении
```

### Клиентское шифрование чата

Сообщения шифруются **в браузере** с помощью Web Crypto API (AES-256-GCM). Сервер хранит только зашифрованный контент. Это значит, что даже при утечке базы данных сообщения остаются конфиденциальными.

### Cookie-based аутентификация

Токены хранятся только в httpOnly cookies -- фронтенд не имеет доступа к JWT:

```typescript
// Установка cookie
res.cookie('token', accessToken, { httpOnly: true, sameSite: 'strict', secure: true });

// Фронтенд отправляет credentials: 'same-origin'
fetch('/api/profile', { credentials: 'same-origin' });
```

### Серверная авторизация Admin Panel

Админ-панель проверяется на сервере перед отдачей HTML:

```typescript
app.get('/admin-panel', (req, res) => {
  // Проверка JWT + role === 'admin' через httpOnly cookie
  // При неудаче — редирект на главную
});
```

### CommonJS в TypeScript

Файлы `.ts` используют `require()` / `module.exports` (CommonJS), а не ES-модули. Это упрощает совместимость и запуск без сборки в режиме разработки (`tsx`).

### In-memory TTL-кэш

Для снижения нагрузки на БД используется `utils/cache.ts`:

```typescript
// При чтении
const cached = getCached('classes:all');
if (cached) return cached;
const result = await db.all('SELECT ...');
setCache('classes:all', result, TTL.CLASSES);  // 5 мин

// При записи
invalidate('classes:all');          // одиночная инвалидация
invalidatePrefix('schedule:');      // массовая инвалидация префикса
```

Кэшируются: classes (5мин), schedule (2мин), announcements (1мин).

### Structured Logging (Pino)

Все запросы логируются через Pino в JSON-формате:

```typescript
// middleware/logger.ts
logger.info({ method, path, status, duration, ip, userId });
```

В production — только `warn` и выше. В development — `info`.

---

## Связи между модулями

```
server.ts
  ├── config/database.ts       (инициализация БД)
  ├── config/container.ts      (DI-контейнер)
  ├── config/email.ts          (SMTP транспорт)
  ├── routes/auth.ts           → services/userService.ts
  ├── routes/grades.ts         → services/gradeService.ts → notificationService
  ├── routes/schedule.ts       → services/scheduleService.ts
  ├── routes/chat.ts           → services/chatService.ts → cryptoService
  ├── routes/homework.ts       → services/homeworkService.ts
  ├── routes/announcements.ts  → services/announcementService.ts
  ├── routes/notifications.ts  → services/notificationService.ts
  ├── routes/admin.ts          → services/adminService.ts → backupService
  ├── routes/reports.ts        → services/reportService.ts
  └── routes/profile.ts        → services/userService.ts
```

---

## Следующие шаги

- [API Reference](API-Reference.md) -- все эндпоинты REST API
- [Authentication](Authentication.md) -- детали JWT-аутентификации
- [Database](Database.md) -- полная схема базы данных
