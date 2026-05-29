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
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-plugin
sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw enable
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
Internet → Caddy (:80/:443) → Node.js App (:3000) → PostgreSQL (:5432)
```

---

## Cloudflare (опционально)

1. SSL/TLS → Origin Server → Create Certificate
2. Скачать `cert.pem`/`key.pem` → `/etc/caddy/certs/`
3. `docker-compose.yml`: `- /etc/caddy/certs:/etc/caddy/certs:ro`
4. `Caddyfile`: `tls /etc/caddy/certs/cert.pem /etc/caddy/certs/key.pem`
5. Cloudflare → SSL/TLS → Full (Strict)

---

## Резервные копии

Автоматические каждый час. Ручные через админ-панель или API.

```bash
docker compose exec app node -e "require('./services/backupService').create()"
cat backups/backup_*.sql | docker compose exec -T db psql -U school school
```

---

## Продакшн-чеклист

- [ ] `JWT_SECRET` — уникальный (мин. 32 символа)
- [ ] `POSTGRES_PASSWORD` — уникальный пароль БД
- [ ] `NODE_ENV=production`
- [ ] SMTP настроен
- [ ] Порты 80/443 открыты
- [ ] SSL работает
- [ ] Бэкапы настроены
- [ ] `.env` не коммитится
