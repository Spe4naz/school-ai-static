# School AI

Интеллектуальная образовательная платформа. Электронный дневник с оценками, расписанием, чатом, домашними заданиями, объявлениями и уведомлениями в реальном времени.

## Возможности

- **Оценки** — выставление и просмотр, недельная навигация (`?week_offset=`)
- **Расписание** — по дням недели, фильтр по классу
- **Чат** — по классам, шифрование AES-256-GCM на клиенте
- **Домашние задания** — создание учителем, просмотр учеником/родителем
- **Объявления** — общешкольные
- **Уведомления** — SSE (Server-Sent Events) в реальном времени
- **Роли** — ученик, родитель, учитель, завуч, администратор
- **Регистрация по кодам** — для учителей и завучей
- **Отчёты** — PDF / Excel по успеваемости
- **Админ-панель** — управление пользователями, классами, бэкапами, регистрационными кодами, просмотр логов

## Стек

- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL 16+ (pg Pool: max=20, min=2, query_timeout=10s)
- **Frontend:** Vanilla JS, Chart.js, ESBuild (сборка)
- **Прокси:** Caddy (авто-SSL, обратный прокси, gzip)
- **Контейнеризация:** Docker / Docker Compose
- **Тестирование:** Jest + Supertest + testcontainers (164 теста)
- **Логирование:** Pino (structured JSON)
- **Безопасность:** helmet + CSP nonces, rate-limit (IP + per-user), JWT в httpOnly cookies, bcrypt (мин. 8 символов + сложность)

## Безопасность

- **Аутентификация:** JWT в httpOnly cookies (токен НЕ передаётся в JSON-ответе)
- **CSP:** Per-request nonces для инлайн-скриптов
- **Пароли:** Минимум 8 символов + строчные + заглавные буквы + цифры
- **Rate-limiting:** Глобальный (100/10мин), login (5/15мин), refresh (10/15мин), upload (10/10мин), per-user (60/1мин)
- **Admin panel:** Серверная проверка JWT + role=admin перед отдачей HTML
- **SSE:** CORS ограничен до FRONTEND_URL, макс. 3 соединения на пользователя
- **Инвалидация:** Все refresh-токены аннулируются при смене пароля
- **Кэш:** In-memory TTL-кэш для classes (5мин), schedule (2мин), announcements (1мин)
- **Graceful shutdown:** SSE-клиентам отправляется shutdown event перед закрытием

## Быстрый старт

### Требования

- Node.js 20+
- PostgreSQL 16+ (или Docker для тестов с testcontainers)

### Установка

```bash
git clone https://github.com/Spe4naz/school-ai-static.git
cd school-ai-static
cp .env.example .env
# отредактировать .env — указать DATABASE_URL
npm install
npm run build
npm run dev
```

Приложение будет доступно на `http://localhost:3000`.

### Тестовые аккаунты

| Email | Пароль | Роль |
|---|---|---|
| admin@school.ru | 123456 | Администратор |
| teacher@school.ru | 123456 | Учитель |
| ivan@school.ru | 123456 | Ученик |
| parent@school.ru | 123456 | Родитель |

> Тестовые пароли (`123456`) не соответствуют требованиям к сложности. Они работают только в seed-данных.

## Деплой (Docker + Caddy)

```bash
cp .env.example .env
nano .env  # задать DOMAIN, JWT_SECRET, DATABASE_URL, SMTP_*
docker compose --env-file .env up -d
docker compose logs -f caddy app
```

### Docker Compose credentials

Пароли БД настраиваются через переменные окружения:

```env
POSTGRES_USER=school
POSTGRES_PASSWORD=<your-strong-password>
POSTGRES_DB=school
```

См. [Деплой](wiki/Deployment.md) для подробностей (Cloudflare, SSL, firewall).

## Админ-панель

```
https://school.net.ru/admin-panel
```

Защищена серверной проверкой JWT + role=admin.

Возможности: дашборд, CRUD пользователей/классов, коды регистрации, бэкапы, логи, настройки.

## Переменные окружения

| Переменная | Обязательная | Описание |
|---|---|---|
| `DOMAIN` | да | Домен для Caddy SSL и email |
| `NODE_ENV` | да | `development`, `production`, `test`, `ci` |
| `PORT` | нет (3000) | Порт сервера |
| `FRONTEND_URL` | да | URL фронтенда (email + CORS) |
| `JWT_SECRET` | да | Мин. 32 символа |
| `DATABASE_URL` | да | PostgreSQL connection string |
| `BCRYPT_ROUNDS` | нет (12) | Раунды bcrypt |
| `SMTP_HOST/PORT/USER/PASS` | для писем | SMTP настройки |
| `BACKUP_DIR` | нет (./backups) | Директория бэкапов |
| `BACKUP_RETENTION_DAYS` | нет (7) | Дней хранения |

## API

| Метод | Путь | Роль | Описание |
|---|---|---|---|
| POST | `/api/login` | — | Вход (токены в httpOnly cookies) |
| POST | `/api/register` | — | Регистрация (с кодом для teacher) |
| POST | `/api/logout` | любая | Выход (очистка cookies) |
| POST | `/api/refresh` | — | Обновление токенов |
| POST | `/api/password/change` | любая | Смена пароля + инвалидация refresh-токенов |
| POST | `/api/password-reset/request` | — | Запрос сброса |
| POST | `/api/password-reset/confirm` | — | Подтверждение сброса |
| GET | `/api/profile` | любая | Профиль |
| GET | `/api/classes` | — | Список классов (кэшируется 5мин) |
| GET/POST | `/api/grades` | teacher+ | Оценки |
| GET/POST | `/api/schedule` | teacher+ | Расписание (кэшируется 2мин) |
| GET/POST/DELETE | `/api/homework` | teacher+ | ДЗ |
| GET/POST/DELETE | `/api/announcements` | teacher+ | Объявления (кэш 1мин) |
| GET/POST | `/api/chat/messages` | любая | Чат |
| GET | `/api/reports/export` | teacher+ | Отчёты PDF/Excel |
| GET | `/api/notifications` | любая | Уведомления |
| GET | `/api/notifications/stream` | любая | SSE (макс. 3/пользователь) |
| PUT | `/api/notifications/read` | любая | Отметить прочитанными |
| GET/POST | `/api/admin/*` | admin | Админ-панель |

## Разработка

```bash
npm run dev:all       # сервер + фронтенд
npm run dev           # сервер отдельно
npm run build:dev     # фронтенд с sourcemaps
npm run typecheck     # проверка типов
npm run lint          # tsc + eslint
npm run lint:fix      # автофикс
npm run format        # prettier
npm run test          # тесты (Docker)
npm run test:silent   # тесты без логов
npm run test:coverage # покрытие
```

### Структура тестов (164 теста)

| Файл | Тип | Описание |
|------|-----|----------|
| `api.test.js` | Интеграционные | Auth, register, CRUD, chat, reports, SSE, cookie auth, password complexity |
| `middleware.test.js` | Модульные | Auth, roles, validate (8+ символов + сложность), errorHandler, requireAuth factory |
| `services.test.js` | Модульные + БД | CryptoService, NotificationService, GradeService (SQL stats), Cache utility |
| `services-extra.test.js` | Модульные + БД | AdminService (кэш), ScheduleService, HomeworkService, AnnouncementService, asyncHandler |
| `unit.test.js` | Модульные (без БД) | AppError, BackupService (_safePath), Cache utility |

### Coverage порог

Минимум 50% для branches, functions, lines, statements.

## Структура проекта

```
├── config/              # Конфигурация (БД, auth, email, DI container, константы)
├── middleware/           # Express middleware (auth, roles, validation, rateLimit, errorHandler, logger, requireAuth)
├── routes/              # Маршруты Express
├── services/            # Бизнес-логика
├── public/              # Статика + фронтенд
│   ├── js/              # ES Modules (собираются в dashboard.bundle.js)
│   ├── style.css        # CSS-компоненты (toast, confirm-modal, card-item, badge)
│   ├── admin-panel.html # SPA (с серверной auth-проверкой)
│   └── dashboard.html   # Основной интерфейс
├── utils/               # Утилиты (AppError, classResolver, cache)
├── __tests__/           # Тесты (Jest + Supertest + testcontainers)
├── server.ts            # Точка входа
├── docker-compose.yml   # Docker Compose (POSTGRES_PASSWORD через env vars)
└── .env.example         # Пример переменных окружения
```

## Фронтенд утилиты

```javascript
import { showToast, showConfirm, escapeHtml, debounce, getRoleLabel } from './utils.js';

showToast('Успешно!', 'success');           // Toast-уведомление
const ok = await showConfirm('Удалить?');   // Модальное подтверждение
escapeHtml('<script>');                     // XSS-защита
debounce(fn, 300);                          // Задержка вызова
getRoleLabel('admin');                      // 'Администратор'
```

## Известные ограничения

- `xlsx` (SheetJS) имеет известные уязвимости (prototype pollution, ReDoS). Альтернатива — `exceljs`.
- Тестовые seed-пароли (`123456`) не соответствуют требованиям к сложности.
