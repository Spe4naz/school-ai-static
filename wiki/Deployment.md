# Развёртывание на сервере

---

## Быстрая установка (3x-ui стиль)

### Одна команда

```bash
curl -fsSL https://raw.githubusercontent.com/Spe4naz/school-ai-static/main/install.sh | sudo bash
```

Скрипт интерактивно запросит:
1. **Порт** (по умолчанию 80)
2. **Домен** (опционально — если нет, доступ по IP)
3. **Email администратора**
4. **Пароль администратора** (мин. 8 символов)
5. **Имя администратора**

После завершения:
- Панель: `http://SERVER_IP:PORT/panel` или `https://DOMAIN/panel`
- Логин/пароль — из введённых данных
- Директория: `/opt/school-ai`

### Управление

```bash
cd /opt/school-ai
docker compose logs -f          # логи
docker compose restart           # перезапуск
docker compose down              # остановка
docker compose pull && docker compose up -d  # обновление
```

---

## Ручная установка

### 1. Подготовка сервера

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-plugin

# Firewall
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. Клонировать проект

```bash
cd /opt
sudo git clone https://github.com/Spe4naz/school-ai-static.git
cd school-ai-static
sudo chown -R $USER:$USER .
```

### 3. Настроить окружение

```bash
cp .env.example .env
nano .env
```

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

### 4. DNS

A-запись домена → IP сервера.

### 5. Запуск

```bash
docker compose build
docker compose --env-file .env up -d
docker compose logs -f caddy app
```

### 6. Проверка

```bash
curl https://your-domain.com/api/health
# {"status":"ok","timestamp":"..."}
```

---

## Архитектура деплоя

```
Internet
    │
    ▼
┌──────────────┐
│    Caddy     │  :80 / :443 (авто-SSL)
└──────┬───────┘
       │ :3000
       ▼
┌──────────────┐
│  Node.js App │  Express + TypeScript
└──────┬───────┘
       │ :5432
       ▼
┌──────────────┐
│  PostgreSQL  │  16-alpine
└──────────────┘
```

---

## Cloudflare (опционально)

1. Cloudflare Dashboard → SSL/TLS → Origin Server → Create Certificate
2. Скачать `cert.pem`/`key.pem` → `/etc/caddy/certs/`
3. В `docker-compose.yml` добавить volume:
   ```yaml
   - /etc/caddy/certs:/etc/caddy/certs:ro
   ```
4. В `Caddyfile`:
   ```caddyfile
   your-domain.com {
       tls /etc/caddy/certs/cert.pem /etc/caddy/certs/key.pem
       reverse_proxy app:3000
   }
   ```
5. Cloudflare → SSL/TLS → Full (Strict)
6. `docker compose restart caddy`

---

## Резервные копии

### Автоматические

Каждый час через `node-cron`. Настройки: `BACKUP_DIR`, `BACKUP_RETENTION_DAYS`.

### Ручные

```bash
# Через Docker
docker compose exec app node -e "require('./services/backupService').create()"

# Через API (админ-панель → Система → Бэкапы)
POST /api/system/backups
```

### Восстановление

```bash
cat backups/backup_*.sql | docker compose exec -T db psql -U school school
```

---

## Обновление

```bash
cd /opt/school-ai
git pull
docker compose build --no-cache
docker compose --env-file .env up -d
```

---

## Устранение проблем

### SSL не получается

```bash
dig +short your-domain.com          # проверить DNS
sudo ufw status                     # проверить порты
docker compose logs -f caddy        # логи Caddy
```

### Приложение не стартует

```bash
docker compose logs app             # логи приложения
docker compose exec db pg_isready -U school  # проверить БД
```

---

## Продакшн-чеклист

- [ ] Домен настроен, A-запись ведёт на IP сервера
- [ ] `JWT_SECRET` — уникальный (мин. 32 символа)
- [ ] `POSTGRES_PASSWORD` — уникальный пароль БД
- [ ] `NODE_ENV=production`
- [ ] SMTP настроен
- [ ] Порты 80/443 открыты
- [ ] SSL работает
- [ ] Бэкапы настроены
- [ ] `.env` не коммитится в git
