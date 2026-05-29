# Развёртывание на сервере

Пошаговое руководство по развёртыванию School AI на Ubuntu/Debian сервере.

---

## Требования

| Компонент | Минимум | Рекомендуется |
|-----------|---------|---------------|
| ОС | Ubuntu 20.04+ / Debian 11+ | Ubuntu 22.04 LTS |
| RAM | 1 GB | 2 GB+ |
| Диск | 10 GB | 20 GB+ |
| CPU | 1 ядро | 2+ ядра |
| Домен | A-запись → IP сервера | — |

---

## Способ 1: Автоматическая установка (рекомендуется)

### Одна команда

```bash
curl -fsSL https://raw.githubusercontent.com/Spe4naz/school-ai-static/main/install.sh | sudo bash
```

Скрипт автоматически:
1. Установит Docker и Docker Compose
2. Клонирует проект
3. Запросит домен, порт, email и пароль администратора
4. Сгенерирует JWT_SECRET и пароль БД
5. Соберёт Docker-образы
6. Запустит все сервисы
7. Получит SSL-сертификат через Let's Encrypt

После завершения откроете `https://<ваш-домен>` и войдите под созданным администратором.

---

## Способ 2: Ручная установка

### Шаг 1. Подготовка сервера

```bash
# Обновить систему
sudo apt update && sudo apt upgrade -y

# Установить Docker
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Открыть порты
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Шаг 2. Клонировать проект

```bash
cd /opt
sudo git clone https://github.com/Spe4naz/school-ai-static.git
cd school-ai-static
sudo chown -R $USER:$USER .
```

### Шаг 3. Настроить окружение

```bash
cp .env.example .env
nano .env
```

Минимальное содержимое `.env`:

```env
DOMAIN=your-domain.com
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-domain.com
JWT_SECRET=<openssl rand -hex 32>
DATABASE_URL=postgresql://school:YOUR_PASSWORD@db:5432/school
POSTGRES_USER=school
POSTGRES_PASSWORD=YOUR_STRONG_PASSWORD
POSTGRES_DB=school
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@your-domain.com
SMTP_PASS=your_smtp_password
BACKUP_DIR=./backups
BACKUP_RETENTION_DAYS=7
```

Генерация безопасных значений:

```bash
# JWT_SECRET
openssl rand -hex 32

# Пароль БД
openssl rand -hex 16
```

### Шаг 4. Настроить DNS

Убедитесь, что A-запись вашего домена указывает на IP сервера:

```bash
# Проверить IP сервера
curl -s ifconfig.me

# Проверить DNS
dig +short your-domain.com
```

### Шаг 5. Запустить

```bash
# Собрать образы
docker compose build

# Запустить
docker compose --env-file .env up -d

# Проверить статус
docker compose ps

# Посмотреть логи
docker compose logs -f caddy app
```

### Шаг 6. Проверить

```bash
# Health check
curl https://your-domain.com/api/health
# {"status":"ok","timestamp":"..."}

# Открыть в браузере
# https://your-domain.com
```

Caddy автоматически получит SSL-сертификат от Let's Encrypt.

---

## Архитектура деплоя

```
Internet
    │
    ▼
┌──────────────┐
│    Caddy     │  :80 / :443 (авто-SSL)
│  (reverse    │
│   proxy)     │
└──────┬───────┘
       │ :3000
       ▼
┌──────────────┐
│  Node.js App │  Express + TypeScript
│  (school-ai) │
└──────┬───────┘
       │ :5432
       ▼
┌──────────────┐
│  PostgreSQL  │  16-alpine
│  (school DB) │
└──────────────┘
```

### Сервисы Docker Compose

| Сервис | Образ | Порты | Описание |
|--------|-------|-------|----------|
| `caddy` | `caddy:2-alpine` | 80, 443 | Reverse proxy, авто-SSL |
| `app` | Собственный (Dockerfile) | 3000 (internal) | Node.js сервер |
| `db` | `postgres:16-alpine` | 5432 (internal) | База данных |

---

## Cloudflare (опционально)

Если сайт за Cloudflare в режиме прокси (оранжевое облако):

1. **Cloudflare Dashboard** → SSL/TLS → Origin Server → Create Certificate
2. Скачать `cert.pem` и `key.pem` → положить на сервер в `/etc/caddy/certs/`
3. В `docker-compose.yml` добавить в `services.caddy.volumes`:
   ```yaml
   - /etc/caddy/certs:/etc/caddy/certs:ro
   ```
4. В `Caddyfile` заменить TLS:
   ```caddyfile
   your-domain.com {
       tls /etc/caddy/certs/cert.pem /etc/caddy/certs/key.pem
       reverse_proxy app:3000
   }
   ```
5. Cloudflare → SSL/TLS → **Full (Strict)**
6. Перезапустить: `docker compose restart caddy`

---

## Управление

### Команды Docker Compose

```bash
docker compose up -d            # Запустить
docker compose down             # Остановить
docker compose restart          # Перезапустить
docker compose logs -f          # Логи (все)
docker compose logs -f app      # Логи приложения
docker compose logs -f db       # Логи БД
docker compose ps               # Статус контейнеров
docker compose build --no-cache # Пересобрать образы
```

### Админ-панель

После входа под администратором: `https://your-domain.com/admin-panel`

Страница **«Система»** в админ-панели показывает:
- Статус БД и Docker
- Список контейнеров с кнопками перезапуска
- Логи приложения (100/500/1000 строк)
- Использование памяти и CPU

---

## Резервные копии

### Автоматические

Бэкапы выполняются каждый час через `node-cron`. Настройки:
- `BACKUP_DIR=./backups` — директория хранения
- `BACKUP_RETENTION_DAYS=7` — автоочистка старше N дней

### Ручные

```bash
# Через Docker
docker compose exec app node -e "require('./services/backupService').create()"

# Через API (из админ-панели)
POST /api/system/backups
```

### Восстановление из бэкапа

```bash
# Найти бэкап
ls backups/

# Восстановить
cat backups/backup_2024-01-15T10-00-00.sql | docker compose exec -T db psql -U school school
```

---

## Обновление

```bash
cd /opt/school-ai-static

# Получить изменения
git pull

# Пересобрать и перезапустить
docker compose build --no-cache
docker compose --env-file .env up -d

# Проверить
docker compose logs -f app
```

---

## Мониторинг

### Health check

```bash
curl https://your-domain.com/api/health
# {"status":"ok","timestamp":"2024-01-15T10:00:00.000Z"}
```

### Docker health check (автоматический)

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1
```

### Логи (Pino JSON)

```bash
# Все логи
docker compose logs -f app

# Только ошибки
docker compose logs -f app 2>&1 | grep '"level":"error"'
```

---

## Устранение проблем

### SSL не получается

```bash
# Проверить DNS
dig +short your-domain.com

# Проверить порты
sudo ufw status
sudo netstat -tlnp | grep -E ':(80|443)'

# Логи Caddy
docker compose logs -f caddy
```

### Приложение не стартует

```bash
# Логи приложения
docker compose logs app

# Проверить БД
docker compose exec db pg_isready -U school

# Проверить .env
cat .env | grep -v PASSWORD | grep -v SECRET
```

### Ошибки в продакшне

```bash
# Проверить переменные окружения
docker compose exec app env | sort

# Проверить подключение к БД
docker compose exec app node -e "require('./config/database').init().then(() => console.log('DB OK'))"
```

---

## Продакшн-чеклист

- [ ] Домен настроен, A-запись ведёт на IP сервера
- [ ] `JWT_SECRET` — уникальный (мин. 32 символа)
- [ ] `POSTGRES_PASSWORD` — уникальный пароль БД
- [ ] `NODE_ENV=production`
- [ ] SMTP настроен (для email-уведомлений)
- [ ] Порты 80/443 открыты в фаерволе
- [ ] SSL работает (Caddy или Cloudflare)
- [ ] Бэкапы настроены (`BACKUP_DIR`, `BACKUP_RETENTION_DAYS`)
- [ ] `.env` не коммитится в git
- [ ] Тестовые seed-пароли не используются в продакшне
