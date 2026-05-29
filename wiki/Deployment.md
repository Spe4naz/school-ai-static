# Деплой

Инструкция по развёртыванию проекта School AI через Docker.

---

## Архитектура деплоя

```
┌─────────────────────────────────────────┐
│              Internet                    │
│                  │                       │
│                  ▼                       │
│         ┌──────────────┐                │
│         │    Caddy     │                │
│         │  :80 / :443  │                │
│         │  (SSL + CORS)│                │
│         └──────┬───────┘                │
│                │ :3000                   │
│                ▼                         │
│         ┌──────────────┐                │
│         │  Node.js App │                │
│         │  (Express)   │                │
│         └──────┬───────┘                │
│                │ :5432                   │
│                ▼                         │
│         ┌──────────────┐                │
│         │  PostgreSQL  │                │
│         │  16-alpine   │                │
│         └──────────────┘                │
└─────────────────────────────────────────┘
```

---

## Docker Compose (продакшн)

Файл: `docker-compose.yml`

### Сервисы

| Сервис | Образ | Порт | Описание |
|--------|-------|------|----------|
| `caddy` | `caddy:2-alpine` | 80, 443 | Reverse proxy, авто-SSL |
| `app` | Собственный (Dockerfile) | 3000 | Node.js сервер |
| `db` | `postgres:16-alpine` | 5432 | База данных |

### Запуск

```bash
# 1. Настройте .env
cp .env.example .env
# Отредактируйте .env

# 2. Запустите
npm run docker:up
# Или напрямую:
docker compose up -d

# 3. Проверьте
curl https://your-domain.com/api/health
```

### Остановка

```bash
npm run docker:down
# Или:
docker compose down
```

### Логи

```bash
npm run docker:logs
# Или:
docker compose logs -f
```

### Полная пересборка

```bash
npm run docker:rebuild
# Или:
docker compose build --no-cache && docker compose up -d
```

---

## Docker Compose (разработка)

Файл: `docker-compose.override.yml`

Переопределяет продакшн-конфигурацию для разработки:

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    volumes:
      - .:/app
      - /app/node_modules
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
```

### Запуск в разработке

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml up
```

---

## Dockerfile (продакшн)

Многоэтапная сборка:

```dockerfile
# Stage 1: Зависимости
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Сборка
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Продакшн
FROM node:20-alpine AS production
RUN apk add --no-cache postgresql-client curl
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

RUN mkdir -p /app/backups /app/public/uploads
RUN chown -R appuser:appgroup /app

USER appuser

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

EXPOSE 3000
CMD ["node", "dist/server.js"]
```

---

## Caddy (Reverse Proxy)

### Авто-SSL

Caddy автоматически получает и обновляет SSL-сертификаты:

```
your-domain.com {
    reverse_proxy app:3000
}
```

### Безопасные заголовки

```yaml
# Добавляются автоматически:
- Strict-Transport-Security (HSTS)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Referrer-Policy: strict-origin-when-cross-origin
```

### Cloudflare Origin CA

Если используется Cloudflare, можно заменить стандартный SSL на Origin CA:

```bash
# Установите Caddy с плагином:
xcaddy build --with github.com/caddy-dns/cloudflare
```

```yaml
# В docker-compose.yml:
caddy:
  image: caddy-dns-cloudflare
```

```
your-domain.com {
    tls {
        dns cloudflare {env.CF_API_TOKEN}
    }
    reverse_proxy app:3000
}
```

---

## Переменные окружения для деплоя

```env
# Обязательные
DOMAIN=your-domain.com
NODE_ENV=production
JWT_SECRET=your-super-secret-key-min-32-chars
DATABASE_URL=postgresql://school:school_pass@db:5432/school_db
FRONTEND_URL=https://your-domain.com

# Опциональные
PORT=3000
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password
BACKUP_DIR=./backups
BACKUP_RETENTION_DAYS=7
```

---

## Резервные копии

### Автоматические бэкапы

Бэкапы выполняются автоматически каждый час через `node-cron`:

```typescript
// server.ts
cron.schedule('0 * * * *', () => {
  backupService.create();
});
```

### Ручные бэкапы

```bash
# Через API:
curl -X POST -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/admin/backups

# Через Docker:
docker compose exec app node -e "require('./dist/services/backupService').create()"
```

### Управление бэкапами

| API | Описание |
|-----|----------|
| `GET /api/admin/backups` | Список бэкапов |
| `POST /api/admin/backups` | Создать бэкап |
| `GET /api/admin/backups/:name/download` | Скачать |
| `DELETE /api/admin/backups/:name` | Удалить |

### Хранение

- Директория: `./backups` (настраивается через `BACKUP_DIR`)
- Формат: SQL-дампы (`backup_YYYY-MM-DDTHH-MM-SS.sql`)
- Автоочистка: старше `BACKUP_RETENTION_DAYS` (по умолчанию 7 дней)

---

## Мониторинг

### Health Check

```bash
curl http://localhost:3000/api/health
# {"status":"ok","timestamp":"..."}
```

### Docker Health Check

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1
```

### Логи

```bash
# Все сервисы:
docker compose logs -f

# Только приложение:
docker compose logs -f app

# Только БД:
docker compose logs -f db
```

---

## Бекап и восстановление

### Создание бекапа

```bash
# Через pg_dump:
docker compose exec db pg_dump -U school school_db > backup.sql
```

### Восстановление

```bash
# Из бекапа:
cat backup.sql | docker compose exec -T db psql -U school school_db
```

---

## Продакшн-чеклист

- [ ] `JWT_SECRET` -- сложный ключ (мин. 32 символа), не дефолтный
- [ ] `NODE_ENV=production`
- [ ] `BCRYPT_ROUNDS` -- 12 (по умолчанию в production)
- [ ] `DATABASE_URL` -- задана и обязательна
- [ ] PostgreSQL -- надёжный пароль, не `school_pass`
- [ ] SMTP -- настроен для email-уведомлений
- [ ] Домен -- прописан в `DOMAIN` и `FRONTEND_URL`
- [ ] SSL -- работает через Caddy
- [ ] Бэкапы -- настроена директория и ретенция
- [ ] Firewall -- порты 80/443 открыты, 3000 закрыт
- [ ] `.env` файлы -- не коммитятся (`.gitignore` содержит `.env*`)
- [ ] Пароли -- seed-пароли (`123456`) заменены на безопасные
