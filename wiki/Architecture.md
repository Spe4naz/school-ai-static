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
├── __tests__/           # 222 теста (Jest + Supertest + testcontainers)
├── server.ts            # Точка входа
├── install.sh           # Установочный скрипт (3x-ui стиль)
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

### DockerService — execFile вместо exec

```javascript
// Безопасно:
this._exec('start', [name]);  // name валидируется regex

// Небезопасно (было):
exec(`docker start ${name}`);
```

### In-memory TTL-кэш

```typescript
const cached = getCached('classes:all');
if (cached) return cached;
const result = await db.all('SELECT ...');
setCache('classes:all', result, TTL.CLASSES);
```

### Setup Wizard

- Санитизация .env записей (отклонение `\n`, `"`, `'`)
- Валидация домена regex `^[a-zA-Z0-9.-]+$`
- Пароль БД генерируется автоматически
- `.setup-creds.json` удаляется после первого входа

### Chat Keys

Ключи шифрования хранятся в `sessionStorage` — при закрытии вкладки ключи удаляются.

### SSE Reconnect

Автоматическое переподключение через 5 секунд при обрыве соединения:

```javascript
es.onerror = () => {
  es.close();
  setTimeout(connectSSE, 5000);
};
```

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
