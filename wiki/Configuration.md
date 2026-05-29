# Конфигурация

Все переменные окружения и настройки проекта.

---

## Переменные окружения

### Обязательные

| Переменная | Описание | Пример |
|------------|----------|--------|
| `DOMAIN` | Домен для Caddy SSL и email-ссылок | `school.example.com` |
| `NODE_ENV` | Режим: `development`, `production`, `test`, `ci` | `development` |
| `JWT_SECRET` | Секрет для подписи JWT (мин. 32 символа) | `my-super-secret-key-123` |
| `DATABASE_URL` | Строка подключения PostgreSQL | `postgresql://user:pass@localhost:5432/db` |
| `FRONTEND_URL` | Полный URL фронтенда (для email-ссылок и CORS) | `https://school.example.com` |

### Опциональные

| Переменная | Значение по умолчанию | Описание |
|------------|----------------------|----------|
| `PORT` | `3000` | Порт сервера |
| `BCRYPT_ROUNDS` | `12` (prod) / `8` (dev) | раунды хеширования bcrypt |
| `SMTP_HOST` | -- | Хост SMTP-сервера |
| `SMTP_PORT` | `587` | Порт SMTP (587=STARTTLS, 465=SSL) |
| `SMTP_USER` | -- | Логин SMTP |
| `SMTP_PASS` | -- | Пароль SMTP |
| `BACKUP_DIR` | `./backups` | Директория для бэкапов |
| `BACKUP_RETENTION_DAYS` | `7` | Дней хранения бэкапов (0=бессрочно) |

### Пример .env

```env
DOMAIN=localhost
NODE_ENV=development
PORT=3000
JWT_SECRET=dev-secret-key-minimum-32-characters-long
DATABASE_URL=postgresql://postgres:password@localhost:5432/school_db
FRONTEND_URL=http://localhost:3000

# SMTP (опционально)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Бэкапы
BACKUP_DIR=./backups
BACKUP_RETENTION_DAYS=7
```

---

## Конфигурационные файлы

### config/auth.ts

Настройки аутентификации:

```typescript
{
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: '24h',                    // Access token: 24 часа
  refreshExpiresInMs: 30 * 24 * 60 * 60 * 1000,  // Refresh token: 30 дней
  bcryptRounds: process.env.BCRYPT_ROUNDS || (isProd ? 12 : 8),
  resetTokenExpiry: 60 * 60 * 1000,      // Сброс пароля: 1 час
}
```

### config/constants.ts

Константы приложения:

```typescript
ROLES: ['admin', 'teacher', 'head_teacher', 'student', 'parent']

DAYS: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

SUBJECTS: [
  'Математика', 'Русский язык', 'Английский язык',
  'Физика', 'Информатика', 'История', 'Биология', 'Химия'
]

LIMITS: {
  CHAT_MESSAGES: 50,        // Макс. сообщений за запрос
  NOTIFICATIONS: 20,        // Макс. уведомлений
  ADMIN_LOGS: 50,           // Макс. записей лога
  GRADE_MIN: 2,             // Мин. оценка
  GRADE_MAX: 5,             // Макс. оценка
  TYPING_TIMEOUT: 10000,    // 10 сек таймаут индикатора
  TYPING_STALE: 15000,      // 15 сек очистка "печатает"
}
```

### config/database.ts

Настройки PostgreSQL:

```typescript
pool: new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                   // Макс. соединений
  idleTimeoutMillis: 30000,  // 30 сек простоя
  connectionTimeoutMillis: 10000,  // 10 сек таймаут подключения
})
```

### config/email.ts

Настройки Nodemailer (только если задан SMTP_HOST):

```typescript
transporter: nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,  // true для порта 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})
```

### config/container.ts

DI-контейнер -- все сервисы создаются как синглтоны.

---

## TypeScript

Файл: `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "node16",
    "moduleResolution": "node16",
    "outDir": "./dist",
    "rootDir": ".",
    "strict": false,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "dist", "__tests__"]
}
```

---

## ESLint

Файл: `.eslintrc.json`

Настройки линтера для поддержания качества кода.

---

## Prettier

Файл: `.prettierrc`

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

---

## EditorConfig

Файл: `.editorconfig`

```ini
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
```

---

## Node.js

Файл: `.nvmrc`

```
22
```

Проект требует Node.js 22+.

---

## NPM Scripts

| Скрипт | Описание |
|--------|----------|
| `npm start` | Запуск продакшн-версии (`node dist/server.js`) |
| `npm run dev` | Разработка с hot-reload (`tsx watch server.ts`) |
| `npm run dev:all` | Сервер + фронтенд одновременно |
| `npm run build` | Сборка TypeScript + фронтенд |
| `npm run build:ts` | Только TypeScript |
| `npm run build:frontend` | Только фронтенд (esbuild, минифицированный) |
| `npm run build:dev` | Фронтенд с sourcemaps |
| `npm run test` | Запуск тестов |
| `npm run test:watch` | Тесты в watch-режиме |
| `npm run test:coverage` | Тесты с покрытием |
| `npm run test:ci` | Тесты для CI |
| `npm run lint` | Типы + ESLint |
| `npm run lint:fix` | ESLint с авто-фиксом |
| `npm run format` | Prettier форматирование |
| `npm run typecheck` | Проверка типов (без компиляции) |
| `npm run clean` | Удалить dist, coverage, backups |
| `npm run docker:build` | Docker Compose build |
| `npm run docker:up` | Docker Compose up |
| `npm run docker:down` | Docker Compose down |
| `npm run docker:logs` | Tail Docker логов |
| `npm run docker:rebuild` | Полная пересборка Docker |
