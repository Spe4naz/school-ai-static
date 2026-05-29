# School AI

Интеллектуальная образовательная платформа — электронный дневник с оценками, расписанием, чатом, домашними заданиями, объявлениями и уведомлениями в реальном времени.

## Возможности

- Электронный дневник с оценками и недельной навигацией
- Расписание уроков по дням недели
- Классный чат с шифрованием AES-256-GCM
- Домашние задания от учителей
- Объявления и уведомления в реальном времени (SSE)
- Отчёты по успеваемости (PDF / Excel)
- 5 ролей: ученик, родитель, учитель, завуч, администратор
- Регистрация по кодам для учителей и завучей
- Админ-панель с управлением пользователями, классами, бэкапами, логами и системой

## Быстрый старт

### Через установочный скрипт (Linux)

```bash
curl -fsSL https://raw.githubusercontent.com/Spe4naz/school-ai-static/main/install.sh | sudo bash
```

Скрипт интерактивно запросит домен, порт, email и пароль администратора, настроит Docker, получит SSL-сертификат и запустит сервер.

### Вручную (Docker)

```bash
git clone https://github.com/Spe4naz/school-ai-static.git
cd school-ai-static
cp .env.example .env
nano .env   #DOMAIN, JWT_SECRET, DATABASE_URL
docker compose --env-file .env up -d
```

Приложение доступно на `https://<ваш-домен>`. SSL получается автоматически через Caddy/Let's Encrypt.

### Локальная разработка

```bash
git clone https://github.com/Spe4naz/school-ai-static.git
cd school-ai-static
npm install
cp .env.example .env
# настроить .env (DATABASE_URL обязателен)
npm run dev
```

http://localhost:3000

### Тестовые аккаунты

| Email | Пароль | Роль |
|-------|--------|------|
| admin@school.ru | 123456 | Администратор |
| teacher@school.ru | 123456 | Учитель |
| ivan@school.ru | 123456 | Ученик |
| parent@school.ru | 123456 | Родитель |

> Тестовые пароли не соответствуют требованиям к сложности и работают только в seed-данных.

## Стек

| Компонент | Технология |
|-----------|-----------|
| Backend | Node.js 20+, Express, TypeScript |
| Database | PostgreSQL 16+ (Pool: max=20, min=2) |
| Frontend | Vanilla JS, Chart.js, ESBuild |
| Прокси | Caddy (авто-SSL, gzip) |
| Логирование | Pino (structured JSON) |
| Тесты | Jest + Supertest + testcontainers (164 теста) |
| Контейнеризация | Docker + Docker Compose |

## Безопасность

- **Аутентификация**: JWT в httpOnly cookies (токен НЕ в JSON-ответе)
- **Пароли**: мин. 8 символов + строчные + заглавные + цифры
- **CSP**: per-request nonces для инлайн-скриптов
- **Rate-limiting**: глобальный, login, refresh, upload, per-user
- **Admin panel**: серверная проверка JWT + role=admin
- **SSE**: CORS ограничен до FRONTEND_URL, макс. 3 соединения/пользователь
- **Кэш**: in-memory TTL для classes (5мин), schedule (2мин), announcements (1мин)

## Переменные окружения

| Переменная | Обязательная | Описание |
|------------|-------------|----------|
| `DOMAIN` | да | Домен для SSL и email |
| `NODE_ENV` | да | `development` / `production` / `test` |
| `PORT` | нет (3000) | Порт сервера |
| `FRONTEND_URL` | да | URL фронтенда для CORS и email |
| `JWT_SECRET` | да | Секрет JWT (мин. 32 символа) |
| `DATABASE_URL` | да | PostgreSQL connection string |
| `BCRYPT_ROUNDS` | нет (12) | Раунды хеширования |
| `SMTP_HOST/PORT/USER/PASS` | для писем | SMTP настройки |
| `BACKUP_DIR` | нет (./backups) | Директория бэкапов |
| `BACKUP_RETENTION_DAYS` | нет (7) | Дней хранения |

## API (основные эндпоинты)

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/login` | Вход (токены в cookies) |
| POST | `/api/register` | Регистрация |
| POST | `/api/logout` | Выход |
| POST | `/api/refresh` | Обновление токенов |
| GET | `/api/profile` | Профиль |
| GET | `/api/classes` | Список классов |
| GET/POST | `/api/grades` | Оценки |
| GET/POST | `/api/schedule` | Расписание |
| GET/POST/DELETE | `/api/homework` | Домашние задания |
| GET/POST | `/api/chat/messages` | Чат |
| GET | `/api/notifications/stream` | SSE уведомления |
| GET/POST | `/api/system/*` | Система (Docker, логи) |
| GET/POST | `/api/admin/*` | Админ-панель |

## Разработка

```bash
npm run dev            # сервер
npm run dev:all        # сервер + фронтенд
npm run build          # сборка TS + frontend
npm run lint           # tsc + eslint
npm run test           # тесты (Docker)
npm run test:coverage  # покрытие (мин. 50%)
```

## Структура проекта

```
config/           Конфигурация (БД, auth, email, container)
middleware/       Express middleware (auth, roles, validate, rateLimit, logger, requireAuth)
routes/           Маршруты (auth, grades, schedule, chat, admin, system, setup)
services/         Бизнес-логика (user, grade, chat, docker, backup, cache)
public/           Статика + фронтенд (JS, CSS, HTML)
utils/            Утилиты (AppError, cache, classResolver)
__tests__/        Тесты (164 теста, Jest + testcontainers)
server.ts         Точка входа
install.sh        Установочный скрипт для Linux
docker-compose.yml Docker Compose
```

## Лицензия

MIT
