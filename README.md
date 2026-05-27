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

- **Backend:** Node.js, Express
- **Database:** PostgreSQL
- **Frontend:** Vanilla JS, Chart.js, ESBuild (сборка)
- **Прокси:** Caddy (авто-SSL, обратный прокси)
- **Контейнеризация:** Docker / Docker Compose

## Быстрый старт (локальная разработка)

### Требования

- Node.js 20+
- PostgreSQL 16+

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
DOMAIN=lumira-server.ru
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://lumira-server.ru
JWT_SECRET=<openssl rand -hex 32>
DATABASE_URL=postgresql://school:school_pass@db:5432/school

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@lumira-server.ru
SMTP_PASS=your_password_here

BACKUP_DIR=./backups
BACKUP_RETENTION_DAYS=7
```

```bash
# 3. Установить Docker
sudo apt update && sudo apt install docker.io docker-compose-v2 -y

# 4. Открыть порты
sudo ufw allow 80/tcp && sudo ufw allow 443/tcp

# 5. Убедиться, что A-запись lumira-server.ru ведёт на IP сервера

# 6. Запустить
docker compose --env-file .env up -d

# 7. Смотреть логи
docker compose logs -f caddy app
```

Сайт будет доступен по `https://lumira-server.ru`.  
Caddy автоматически выпустит Let's Encrypt SSL-сертификат.

## Cloudflare Origin CA (если сайт за Cloudflare)

Если Cloudflare в режиме прокси (оранжевое облако), Caddy не сможет получить сертификат.  
Нужно использовать Origin CA от Cloudflare.

### 1. Получить сертификат

Cloudflare Dashboard → **SSL/TLS → Origin Server → Create Certificate**  
Скачать `cert.pem` и `key.pem`, закинуть на сервер в `/etc/caddy/certs/`.

### 2. Caddyfile (`lumira-server.ru`)

```caddyfile
lumira-server.ru {
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
https://lumira-server.ru/admin-panel
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
| `DOMAIN` | да | — | Домен (для Caddy и писем) |
| `NODE_ENV` | да | `development` | `development`, `production`, `test` |
| `PORT` | нет | `3000` | Порт приложения |
| `FRONTEND_URL` | да | — | URL фронтенда (для ссылок в письмах) |
| `JWT_SECRET` | да | — | Секрет для JWT (минимум 32 символа) |
| `BCRYPT_ROUNDS` | нет | `12` | Сложность хеширования паролей |
| `DATABASE_URL` | да | — | Строка подключения к PostgreSQL |
| `SMTP_HOST` | для писем | — | SMTP-сервер |
| `SMTP_PORT` | нет | `587` | Порт SMTP |
| `SMTP_USER` | для писем | — | Логин SMTP |
| `SMTP_PASS` | для писем | — | Пароль SMTP |
| `BACKUP_DIR` | нет | `./backups` | Директория бэкапов |
| `BACKUP_RETENTION_DAYS` | нет | `7` | Дней хранения бэкапов |

## API

Основные эндпоинты (все, кроме `/api/auth/login` и `/api/auth/register`, требуют JWT в `Authorization: Bearer <token>`):

| Метод | Путь | Роль | Описание |
|---|---|---|---|
| POST | `/api/auth/login` | — | Вход |
| POST | `/api/auth/register` | — | Регистрация |
| POST | `/api/auth/logout` | любая | Выход |
| GET | `/api/profile` | любая | Профиль |
| GET/POST | `/api/grades` | teacher+ | Оценки |
| GET/POST | `/api/schedule` | teacher+ | Расписание |
| GET/POST | `/api/homework` | teacher+ | ДЗ |
| GET/POST | `/api/announcements` | teacher+ | Объявления |
| GET/POST | `/api/chat/:classId` | teacher+ | Чат |
| GET | `/api/reports/:studentId` | teacher+ | Отчёты |
| GET | `/api/notifications/stream` | любая | SSE уведомления |
| GET/POST/PUT/DELETE | `/api/admin/*` | admin | Админ-панель |

## Разработка

```bash
# watch-режим frontend
npm run watch

# линтер
npm run lint

# форматирование
npm run format

# тесты (требуется запущенный PostgreSQL)
npm run test

# docker для разработки
docker compose up -d
```

## Структура проекта

```
├── config/              # Конфигурация, БД, контейнер, константы
├── middleware/           # Express-мидлвары (auth, roles, validate, logger)
├── routes/              # Маршруты Express
├── services/            # Бизнес-логика
├── public/              # Статика (HTML, CSS, JS, изображения)
│   ├── js/              # Исходники frontend (собираются в dashboard.bundle.js)
│   ├── admin-panel.html # SPA панель управления
│   └── dashboard.html   # Основной интерфейс
├── utils/               # Вспомогательные утилиты
├── __tests__/           # Тесты (Jest + Supertest)
├── backups/             # Резервные копии БД
├── server.js            # Точка входа
├── Dockerfile           # Production-образ
├── Dockerfile.dev       # Dev-образ
├── docker-compose.yml   # Docker Compose
├── Caddyfile            # Конфиг Caddy
└── .env.example         # Пример переменных окружения
```
