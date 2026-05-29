# Конфигурация

Все переменные окружения и настройки проекта.

---

## Переменные окружения

### Обязательные

| Переменная | Описание | Пример |
|------------|----------|--------|
| `DOMAIN` | Домен для SSL и email | `school.example.com` |
| `NODE_ENV` | Режим: `development`, `production`, `test`, `ci` | `development` |
| `JWT_SECRET` | Секрет JWT (мин. 32 символа) | `openssl rand -hex 32` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `FRONTEND_URL` | URL фронтенда для CORS и email | `https://school.example.com` |

### Опциональные

| Переменная | По умолчанию | Описание |
|------------|-------------|----------|
| `PORT` | `3000` | Порт сервера |
| `BCRYPT_ROUNDS` | `12` (prod) / `8` (dev) | Раунды bcrypt |
| `SMTP_HOST` | — | Хост SMTP |
| `SMTP_PORT` | `587` | Порт SMTP |
| `SMTP_USER` | — | Логин SMTP |
| `SMTP_PASS` | — | Пароль SMTP |
| `BACKUP_DIR` | `./backups` | Директория бэкапов |
| `BACKUP_RETENTION_DAYS` | `7` | Дней хранения |
| `POSTGRES_USER` | `school` | Пользователь БД |
| `POSTGRES_PASSWORD` | — | Пароль БД |
| `POSTGRES_DB` | `school` | Имя БД |

### Пример .env

```env
DOMAIN=localhost
NODE_ENV=development
PORT=3000
JWT_SECRET=dev-secret-key-minimum-32-characters-long
DATABASE_URL=postgresql://school:school_pass@localhost:5432/school
FRONTEND_URL=http://localhost:3000
BACKUP_DIR=./backups
BACKUP_RETENTION_DAYS=7
```

---

## Конфигурационные файлы

### config/auth.ts

```typescript
{
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: '24h',
  refreshExpiresInMs: 30 * 24 * 60 * 60 * 1000, // 30 дней
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || (isProd ? 12 : 8),
  resetTokenExpiry: 60 * 60 * 1000, // 1 час
}
```

### config/database.ts

```typescript
pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  min: 2,
  idleTimeoutMillis: 30000,
  query_timeout: 10000,
});
pool.on('error', (err) => console.error('Pool error:', err.message));
```

### middleware/logger.ts (Pino)

```typescript
level: isTest ? 'silent' : (isProduction ? 'warn' : 'info')
```

### utils/cache.ts

```typescript
TTL = {
  CLASSES: 5 * 60 * 1000,      // 5 мин
  SCHEDULE: 2 * 60 * 1000,     // 2 мин
  ANNOUNCEMENTS: 60 * 1000,    // 1 мин
}
```

---

## NPM Scripts

| Скрипт | Описание |
|--------|----------|
| `npm run dev` | Сервер с hot-reload |
| `npm run dev:all` | Сервер + фронтенд |
| `npm run build` | Сборка TS + frontend |
| `npm run lint` | tsc + eslint |
| `npm run test` | Тесты (Docker) |
| `npm run test:coverage` | Тесты с покрытием |
| `npm run docker:up` | Docker Compose up |
| `npm run docker:down` | Docker Compose down |
| `npm run docker:logs` | Логи Docker |
| `npm run docker:rebuild` | Полная пересборка |

---

## TypeScript

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "node16",
    "strict": false,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  }
}
```
