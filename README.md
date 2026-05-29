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
- **Database:** PostgreSQL 16+ (pg Pool: max=20, query_timeout=10s)
- **Frontend:** Vanilla JS, Chart.js, ESBuild (сборка)
- **Прокси:** Caddy (авто-SSL, обратный прокси, gzip)
- **Контейнеризация:** Docker / Docker Compose
- **Тестирование:** Jest + Supertest + testcontainers (Docker-контейнер на все тесты)
- **Сжатие:** compression (gzip) — все ответы
- **Безопасность:** helmet + CSP nonces, rate-limit (IP + per-user), JWT в httpOnly cookies, bcrypt (мин. 8 символов + сложность)

## Безопасность (ключевые особенности)

- **Аутентификация:** JWT в httpOnly cookies (токен НЕ передаётся в JSON-ответе)
- **CSP:** Per-request nonces для инлайн-скриптов
- **Пароли:** Минимум 8 символов + строчные + заглавные буквы + цифры
- **Rate-limiting:** Глобальный (100/10мин), login (5/15мин), refresh (10/15мин), upload (10/10мин), per-user (60/1мин)
- **Admin panel:** Серверная проверка JWT + role=admin перед отдачей HTML
- **SSE:** CORS ограничен до FRONTEND_URL, макс. 3 соединения на пользователя
- **Инвалидация:** Все refresh-токены аннулируются при смене пароля

## Быстрый старт (локальная разработка)

### Требования

- Node.js 20+
- PostgreSQL 16+ (или Docker для тестов с testcontainers)

### Установка

```bash
# клонировать
git clone https://github.com/Spe4naz/school-ai-static.git
cd school-ai-static

# настроить окружение
cp .env.example .env
# отредактировать .env — указать DATABASE_URL под вашу PostgreSQL

# установить зависимости
npm install

# собрать frontend
npm run build

# запустить
npm run dev
```

Приложение будет доступно на `http://localhost:3000`.

### Тестовые аккаунты (создаются автоматически при пустой БД)

| Email | Пароль | Роль |
|---|---|---|
| admin@school.ru | 123456 | Администратор |
| teacher@school.ru | 123456 | Учитель |
| ivan@school.ru | 123456 | Ученик |
| parent@school.ru | 123456 | Родитель |

> **Примечание:** Тестовые пароли (`123456`) не соответствуют требованиям к сложности (мин. 8 символов + строчные + заглавные + цифры). Они работают только в seed-данных. При регистрации или смене пароля требования применяются.

## Деплой на Ubuntu Server (Docker + Caddy)

```bash
# 1. Клонировать
git clone https://github.com/Spe4naz/school-ai-static.git
cd school-ai-static

# 2. Создать .env
cp .env.example .env
nano .env
```

Минимальное содержимое `.env`:

```env
DOMAIN=school.net.ru
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://school.net.ru
JWT_SECRET=<openssl rand -hex 32>
DATABASE_URL=postgresql://school:school_pass@db:5432/school

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@school.net.ru
SMTP_PASS=your_password_here

BACKUP_DIR=./backups
BACKUP_RETENTION_DAYS=7
```

```bash
# 3. Установить Docker
sudo apt update && sudo apt install docker.io docker-compose-v2 -y

# 4. Открыть порты
sudo ufw allow 80/tcp && sudo ufw allow 443/tcp

# 5. Убедиться, что A-запись school.net.ru ведёт на IP сервера

# 6. Запустить (основной compose, без override — он для разработки)
docker compose -f docker-compose.yml --env-file .env up -d

# 7. Смотреть логи
docker compose logs -f caddy app
```

### Локальный доступ для тестирования (localhost:3000)

Чтобы на сервере открыть `http://localhost:3000` в обход Caddy (например, для отладки):

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml --env-file .env up -d
```

Порт 3000 маппится на интерфейс `0.0.0.0`, поэтому закройте его фаерволом, если не нужен внешним:

```bash
sudo ufw deny 3000/tcp
# или оставить только localhost:
sudo ufw allow from 127.0.0.1 to any port 3000
```

Сайт будет доступен по `https://school.net.ru`.  
Caddy автоматически выпустит Let's Encrypt SSL-сертификат.

## Cloudflare Origin CA (если сайт за Cloudflare)

Если Cloudflare в режиме прокси (оранжевое облако), Caddy не сможет получить сертификат.  
Нужно использовать Origin CA от Cloudflare.

### 1. Получить сертификат

Cloudflare Dashboard → **SSL/TLS → Origin Server → Create Certificate**  
Скачать `cert.pem` и `key.pem`, закинуть на сервер в `/etc/caddy/certs/`.

### 2. Caddyfile (`school.net.ru`)

```caddyfile
school.net.ru {
    tls /etc/caddy/certs/cert.pem /etc/caddy/certs/key.pem

    reverse_proxy app:3000

    headers {
        Strict-Transport-Security max-age=31536000
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        Referrer-Policy strict-origin-when-cross-origin
    }
}
```

### 3. Подмонтировать сертификаты в `docker-compose.yml`

Добавить в `services.caddy.volumes`:

```yaml
      - /etc/caddy/certs:/etc/caddy/certs:ro
```

### 4. Cloudflare → SSL/TLS → Full (Strict)

### 5. Запустить

```bash
docker compose --env-file .env up -d
```

Origin-сертификат действителен 15 лет.

## Админ-панель

После входа под администратором — ссылка в сайдбаре, или открыть вручную:

```
https://school.net.ru/admin-panel
```

Админ-панель защищена на серверном уровне — проверяется JWT + role=admin.

Возможности:
- Дашборд со статистикой
- Управление пользователями (CRUD)
- Управление классами (CRUD)
- Просмотр оценок и расписания
- Генерация кодов регистрации (для учителей и завучей)
- Резервные копии (создание, скачивание, удаление)
- Журнал действий
- Просмотр параметров системы

## Переменные окружения

| Переменная | Обязательная | По умолчанию | Описание |
|---|---|---|---|
| `DOMAIN` | да | — | Домен сайта, используется Caddy для авто-SSL и в ссылках писем. Пример: school.net.ru |
| `NODE_ENV` | да | `development` | Режим: `development`, `production`, `test`, `ci` |
| `PORT` | нет | `3000` | Порт, на котором приложение слушает HTTP-запросы |
| `FRONTEND_URL` | да | — | Полный URL фронтенда (для email-ссылок и CORS). Пример: https://school.net.ru |
| `JWT_SECRET` | да | — | Секретный ключ подписи JWT. Минимум 32 символа. Генерация: `openssl rand -hex 32` |
| `DATABASE_URL` | да | — | Строка подключения к PostgreSQL. Формат: `postgresql://user:pass@host:port/db` |
| `BCRYPT_ROUNDS` | нет | `12` | Раундов хеширования bcrypt |
| `SMTP_HOST` | для писем | — | Адрес SMTP-сервера |
| `SMTP_PORT` | нет | `587` | Порт SMTP |
| `SMTP_USER` | для писем | — | Логин SMTP |
| `SMTP_PASS` | для писем | — | Пароль SMTP |
| `BACKUP_DIR` | нет | `./backups` | Директория для бэкапов |
| `BACKUP_RETENTION_DAYS` | нет | `7` | Дней хранения бэкапов |

## API

Основные эндпоинты:

| Метод | Путь | Роль | Описание |
|---|---|---|---|
| POST | `/api/login` | — | Вход (токены в httpOnly cookies) |
| POST | `/api/register` | — | Регистрация (с кодом для teacher) |
| POST | `/api/logout` | любая | Выход (очистка cookies + инвалидация refresh-token) |
| POST | `/api/refresh` | — | Обновление токенов (refresh из cookie или body) |
| POST | `/api/password/change` | любая | Смена пароля + инвалидация всех refresh-токенов |
| POST | `/api/password-reset/request` | — | Запрос сброса пароля |
| POST | `/api/password-reset/confirm` | — | Подтверждение сброса |
| GET | `/api/profile` | любая | Профиль |
| GET | `/api/classes` | — | Список классов (публичный) |
| GET/POST | `/api/grades` | teacher+ | Оценки |
| GET/POST | `/api/schedule` | teacher+ | Расписание |
| GET/POST/DELETE | `/api/homework` | teacher+ | ДЗ |
| GET/POST/DELETE | `/api/announcements` | teacher+ | Объявления |
| GET/POST | `/api/chat/messages` | любая | Чат |
| GET | `/api/reports/export` | teacher+ | Отчёты PDF/Excel |
| GET | `/api/notifications` | любая | Уведомления |
| GET | `/api/notifications/stream` | любая | SSE (макс. 3 соединения/пользователь) |
| PUT | `/api/notifications/read` | любая | Отметить прочитанными |
| GET/POST | `/api/admin/*` | admin | Админ-панель |

## Разработка

```bash
# сервер + фронтенд одновременно
npm run dev:all

# сервер отдельно
npm run dev

# фронтенд отдельно
npm run build:dev

# typecheck
npm run typecheck

# линтер + typecheck
npm run lint

# автофикс линтера
npm run lint:fix

# форматирование
npm run format

# тесты (требуется Docker — testcontainers запускает PostgreSQL)
npm run test

# тесты без логов
npm run test:silent

# покрытие
npm run test:coverage

# docker для разработки
docker compose up -d
```

### Структура тестов

| Файл | Тип | Описание |
|------|-----|----------|
| `api.test.js` | Интеграционные | login, register, grades, schedule, chat, reports, logout, password change, SSE, cookie-based auth |
| `middleware.test.js` | Модульные | auth, roles, validate (пароль 8+ символов + сложность), errorHandler |
| `services.test.js` | Модульные + БД | CryptoService, NotificationService, GradeService |
| `services-extra.test.js` | Модульные + БД | AdminService, ScheduleService, asyncHandler |
| `unit.test.js` | Модульные (без БД) | AppError, BackupService |

## Структура проекта

```
├── config/              # Конфигурация (БД, auth, email, DI container, константы)
├── middleware/           # Express middleware (auth, roles, validation, rateLimit, errorHandler, logger)
├── routes/              # Маршруты Express (auth, grades, schedule, chat, homework, admin, ...)
├── services/            # Бизнес-логика (user, grade, notification, chat, backup, crypto, homework, schedule, announcement, admin)
├── public/              # Статика + фронтенд
│   ├── js/              # Исходники frontend (ES Modules, собираются в dashboard.bundle.js)
│   ├── admin-panel.html # SPA панель управления (с серверной auth-проверкой)
│   └── dashboard.html   # Основной интерфейс
├── utils/               # Вспомогательные утилиты (AppError, classResolver)
├── __tests__/           # Тесты (Jest + Supertest + testcontainers)
├── server.ts            # Точка входа сервера
├── Dockerfile           # Production-образ
├── docker-compose.yml   # Docker Compose
├── Caddyfile            # Конфиг Caddy
└── .env.example         # Пример переменных окружения
```

## Известные ограничения

- `xlsx` (SheetJS) имеет известные уязвимости (prototype pollution, ReDoS). Альтернатива — `exceljs`.
- Тестовые seed-пароли (`123456`) не соответствуют требованиям к сложности.
