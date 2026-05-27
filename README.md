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

- **Backend:** Node.js, Express, TypeScript (ts-jest)
- **Database:** PostgreSQL 16+ (pg Pool: max=20, query_timeout=10s)
- **Frontend:** Vanilla JS, Chart.js, ESBuild (сборка)
- **Прокси:** Caddy (авто-SSL, обратный прокси, gzip)
- **Контейнеризация:** Docker / Docker Compose
- **Тестирование:** Jest + Supertest + testcontainers (Docker-контейнер на все тесты)
- **Сжатие:** compression (gzip) — все ответы
- **Безопасность:** helmet, rate-limit, JWT (HS256 + issuer), защита от path traversal в бэкапах

## Быстрый старт (локальная разработка)

### Требования

- Node.js 22+
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

# 6. Запустить
docker compose --env-file .env up -d

# 7. Смотреть логи
docker compose logs -f caddy app
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
| `NODE_ENV` | да | `development` | Режим: `development` (подробные логи), `production` (минимум логов, кеш), `test` (тесты, изолированная БД) |
| `PORT` | нет | `3000` | Порт, на котором приложение слушает HTTP-запросы |
| `FRONTEND_URL` | да | — | Полный URL фронтенда для ссылок в email-письмах. Пример: https://school.net.ru |
| `JWT_SECRET` | да | — | Секретный ключ подписи JWT. Минимум 32 символа. Генерация: `openssl rand -hex 32` |
| `BCRYPT_ROUNDS` | нет | `12` | Раундов хеширования bcrypt. Больше = безопаснее, но медленнее |
| `DATABASE_URL` | да | — | Строка подключения к PostgreSQL. Формат: `postgresql://user:pass@host:port/db` |
| `SMTP_HOST` | для писем | — | Адрес SMTP-сервера для отправки email. Примеры: `smtp.yandex.ru`, `smtp.gmail.com` |
| `SMTP_PORT` | нет | `587` | Порт SMTP: `587` (STARTTLS), `465` (SSL) |
| `SMTP_USER` | для писем | — | Логин SMTP. Обычно email отправителя |
| `SMTP_PASS` | для писем | — | Пароль SMTP. Для Gmail — пароль приложения |
| `BACKUP_DIR` | нет | `./backups` | Директория для дампов PostgreSQL (относительный или абсолютный путь) |
| `BACKUP_RETENTION_DAYS` | нет | `7` | Дней хранения бэкапов. `0` — не удалять никогда |

## API

Основные эндпоинты:

| Метод | Путь | Роль | Описание |
|---|---|---|---|---|
| POST | `/api/login` | — | Вход (JWT + refresh-token) |
| POST | `/api/register` | — | Регистрация (с кодом для teacher) |
| POST | `/api/logout` | любая | Выход (аннулирование refresh-token) |
| POST | `/api/refresh` | — | Обновление access-token |
| POST | `/api/password/change` | любая | Смена пароля (требуется currentPassword) |
| POST | `/api/password-reset/request` | — | Запрос сброса пароля (email) |
| POST | `/api/password-reset/confirm` | — | Подтверждение сброса (id + email + newPassword) |
| GET | `/api/profile` | любая | Профиль |
| GET | `/api/classes` | — | Список классов (публичный) |
| GET/POST | `/api/grades` | teacher+ | Оценки (+ writeLimiter) |
| GET/POST | `/api/schedule` | teacher+ | Расписание (+ writeLimiter) |
| GET/POST/DELETE | `/api/homework` | teacher+ | ДЗ (Zod-валидация) |
| GET/POST/DELETE | `/api/announcements` | teacher+ | Объявления (Zod-валидация) |
| GET/POST | `/api/chat/messages` | любая | Чат (+ writeLimiter) |
| GET | `/api/reports/export` | teacher+ | Отчёты PDF/Excel |
| GET | `/api/notifications` | любая | Уведомления |
| GET | `/api/notifications/stream` | любая | SSE в реальном времени |
| PUT | `/api/notifications/read` | любая | Отметить прочитанными |
| GET/POST | `/api/admin/*` | admin | Админ-панель |

## Разработка

```bash
# сервер + фронтенд одновременно (tsx watch + esbuild --watch)
npm run dev:all

# сервер отдельно
npm run dev

# фронтенд отдельно
npm run build:dev

# typecheck (без линтинга)
npm run typecheck

# линтер + typecheck
npm run lint

# автофикс линтера
npm run lint:fix

# форматирование
npm run format

# тесты (требуется Docker — testcontainers запускает PostgreSQL)
npm run test

# тесты без логов консоли
npm run test:silent

# покрытие
npm run test:coverage

# docker для разработки
docker compose up -d
```

### Отладка в VSCode

В `.vscode/launch.json` три конфигурации:
- **Dev server** — запуск через tsx
- **Run tests** — все тесты
- **Debug current test** — текущий открытый файл

### Структура тестов

| Файл | Тип | Тестов |
|------|-----|-------|
| `api.test.js` | Интеграционные (supertest) | login, register, grades, schedule, chat, reports, logout, password change, SSE, Zod-валидация |
| `middleware.test.js` | Модульные | auth, roles, validate, errorHandler |
| `services.test.js` | Модульные + БД | CryptoService, NotificationService, GradeService |
| `services-extra.test.js` | Модульные + БД | AdminService, ScheduleService, asyncHandler |
| `unit.test.js` | Модульные (без БД) | AppError, BackupService |

## Структура проекта

```
├── config/              # Конфигурация, БД, контейнер, константы
├── middleware/           # Express-мидлвары (auth, roles, validate, errorHandler, logger, rateLimit)
├── routes/              # Маршруты Express (auth, grades, schedule, chat, homework, admin, ...)
├── services/            # Бизнес-логика (user, grade, notification, chat, backup, crypto, homework, schedule, announcement, admin)
├── public/              # Статика (HTML, CSS, JS, изображения)
│   ├── js/              # Исходники frontend (собираются в dashboard.bundle.js через ESBuild)
│   ├── admin-panel.html # SPA панель управления
│   └── dashboard.html   # Основной интерфейс
├── utils/               # Вспомогательные утилиты (AppError, classResolver)
├── scripts/             # Вспомогательные скрипты (dev.js)
├── .vscode/             # VSCode debug config (launch.json)
├── .nvmrc               # Фиксация версии Node.js
├── .gitattributes       # Нормализация line-endings
├── __tests__/           # Тесты (Jest + Supertest + testcontainers)
├── backups/             # Резервные копии БД
├── server.js            # Точка входа
├── Dockerfile           # Production-образ
├── Dockerfile.dev       # Dev-образ
├── docker-compose.yml   # Docker Compose
├── Caddyfile            # Конфиг Caddy
└── .env.example         # Пример переменных окружения
```

## Поддерживаемые ОС

| ОС | Статус | Замечания |
|---|---|---|
| **Linux** (Ubuntu 20.04+, Debian 11+, CentOS 8+) | ✅ Полная поддержка | Рекомендуемая платформа для продакшна |
| **Windows** (10/11, Server 2019+) | ✅ Разработка | Через WSL2 или Docker Desktop |
| **macOS** | ✅ Разработка | Через Docker Desktop |

## Удаление

### Локальная разработка (без Docker)

```bash
# остановить сервер (Ctrl+C)

# удалить БД
psql -U postgres -c "DROP DATABASE school;"
psql -U postgres -c "DROP ROLE school;"

# удалить директорию проекта
cd ..
Remove-Item -Recurse -Force school-ai-static  # Windows
# или
rm -rf school-ai-static                        # Linux / macOS
```

### Docker (продакшн)

```bash
docker compose --env-file .env down -v       # остановить и удалить volumes
docker rmi school-ai-static-app               # удалить образ
rm -rf school-ai-static                       # удалить проект
```

### Полная очистка (все данные)

```bash
# остановить контейнеры и удалить всё
docker compose --env-file .env down -v
docker system prune -a --volumes

# удалить директорию
cd ..
rm -rf school-ai-static
```

> **Внимание:** `down -v` безвозвратно удаляет volume с БД.  
> Перед удалением сделайте бэкап: `npm run backup` или `docker compose exec app node -e "require('./services/backupService').createBackup()"`
