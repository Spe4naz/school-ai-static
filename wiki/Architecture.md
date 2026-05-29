# Архитектура проекта

---

## Общая схема

```
┌─────────────────────────────────────────────────────┐
│                     КЛИЕНТ                          │
│  (dashboard.html / admin-panel.html / setup.html)   │
│  Vanilla JS + Web Crypto API                        │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP / SSE
                       ▼
┌─────────────────────────────────────────────────────┐
│               EXPRESS SERVER (server.ts)             │
│                                                     │
│  Middleware:                                         │
│  compression → cookieParser → cspNonce → helmet     │
│  → express.json → logger (pino) → apiLimiter        │
│                                                     │
│  Routes:                                            │
│  setup → auth → grades → schedule → chat → admin    │
│  → system → notifications → homework → announcements│
│                                                     │
│  Services:                                          │
│  userService, gradeService, chatService,             │
│  notificationService, adminService, dockerService    │
│                                                     │
│  Utils: cache (TTL), AppError, classResolver         │
└──────────────────────┬──────────────────────────────┘
                       │ SQL (pg Pool)
                       ▼
┌─────────────────────────────────────────────────────┐
│                  PostgreSQL 16                       │
└─────────────────────────────────────────────────────┘
```

---

## Структура директорий

```
school-ai-static/
├── config/              # БД, auth, email, container, constants
├── middleware/           # auth, roles, validate, rateLimit, errorHandler, logger, requireAuth
├── routes/              # auth, grades, schedule, chat, admin, system, setup, ...
├── services/            # user, grade, chat, notification, admin, docker, backup, crypto
├── public/              # Статика + фронтенд
│   ├── js/              # ES Modules → dashboard.bundle.js
│   ├── style.css        # CSS-компоненты
│   ├── admin-panel.html # SPA (с серверной auth-проверкой)
│   ├── setup.html       # Setup wizard
│   └── dashboard.html   # Основной интерфейс
├── utils/               # AppError, classResolver, cache
├── __tests__/           # 164 теста (Jest + Supertest + testcontainers)
├── server.ts            # Точка входа
├── install.sh           # Установочный скрипт для Linux
└── docker-compose.yml   # Docker Compose
```

---

## Middleware Pipeline

```
Request
  │
  ▼
compression → cookieParser → cspNonce → helmet (+nonces)
  → express.json → logger (pino) → apiLimiter
  │
  ▼
setup check → [Public route] ИЛИ [Auth] → [Roles] → [Validate]
  │
  ▼
Route handler → Service → DB query → Response (+ errorHandler)
```

---

## Ключевые решения

### Cookie-based аутентификация

Токены хранятся только в httpOnly cookies. Фронтенд использует `credentials: 'same-origin'`.

```typescript
res.cookie('token', accessToken, { httpOnly: true, sameSite: 'strict', secure: true });
res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'strict', secure: true, maxAge: 30d });
```

### In-memory TTL-кэш

```typescript
const cached = getCached('classes:all');
if (cached) return cached;
const result = await db.all('SELECT ...');
setCache('classes:all', result, TTL.CLASSES);
```

### Structured Logging (Pino)

```typescript
logger.info({ method, path, status, duration, ip, userId });
```

### CommonJS в TypeScript

Файлы `.ts` используют `require()` / `module.exports` для совместимости с `tsx`.

---

## Связи между модулями

```
server.ts
  ├── config/database.ts       (инициализация БД)
  ├── config/container.ts      (DI-контейнер)
  ├── config/email.ts          (lazy SMTP)
  ├── routes/setup.ts          (first-run wizard)
  ├── routes/auth.ts           → userService
  ├── routes/grades.ts         → gradeService → notificationService
  ├── routes/chat.ts           → chatService → cryptoService
  ├── routes/admin.ts          → adminService
  ├── routes/system.ts         → dockerService
  ├── routes/notifications.ts  → notificationService (SSE)
  ├── routes/homework.ts       → homeworkService
  ├── routes/announcements.ts  → announcementService
  └── routes/reports.ts        → reportService
```
