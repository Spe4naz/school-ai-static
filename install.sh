#!/bin/bash
# School AI — Install Script
# Access panel at http://SERVER_IP:PORT/panel
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "  ============================================"
echo "       School AI - Установка"
echo "       Интеллектуальная образовательная"
echo "             платформа"
echo "  ============================================"
echo ""

# ==================== ПРОВЕРКИ ====================

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ОШИБКА] Запустите от root: sudo bash install.sh${NC}"
  exit 1
fi

SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "127.0.0.1")
echo -e "${BLUE}Обнаружен IP сервера: ${SERVER_IP}${NC}"

# ==================== DOCKER ====================

echo ""
echo -e "${YELLOW}[1/7] Проверка Docker...${NC}"

if command -v docker &> /dev/null; then
  echo -e "${GREEN}  Docker уже установлен${NC}"
else
  echo -e "${BLUE}  Установка Docker...${NC}"
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg 2>/dev/null
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
  systemctl enable docker
  systemctl start docker
  echo -e "${GREEN}  Docker установлен${NC}"
fi

# ==================== КЛОНИРОВАНИЕ ====================

echo ""
echo -e "${YELLOW}[2/7] Получение проекта...${NC}"

INSTALL_DIR="/opt/school-ai"
if [ -d "$INSTALL_DIR/.git" ]; then
  echo -e "${BLUE}  Обновление...${NC}"
  cd "$INSTALL_DIR"
  git pull -q 2>/dev/null || true
else
  echo -e "${BLUE}  Клонирование...${NC}"
  git clone -q https://github.com/Spe4naz/school-ai-static.git "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi
echo -e "${GREEN}  Проект: $INSTALL_DIR${NC}"

# ==================== НАСТРОЙКА ====================

echo ""
echo -e "${YELLOW}[3/7] Настройка...${NC}"
echo ""
echo "  ============================================"
echo "  Настройте параметры вашего сервера"
echo "  ============================================"
echo ""

# Порт
PANEL_PORT=""
while [ -z "$PANEL_PORT" ]; do
  echo -n "  Порт для панели [80]: "
  read -r PANEL_PORT
  PANEL_PORT=${PANEL_PORT:-80}
done

# Домен
echo ""
echo "  Если у вас есть домен — введите его."
echo "  Если нет — нажмите Enter для IP-доступа."
DOMAIN=""
echo -n "  Домен (опционально): "
read -r DOMAIN

# Логин
ADMIN_EMAIL=""
while [ -z "$ADMIN_EMAIL" ]; do
  echo -n "  Логин администратора: "
  read -r ADMIN_EMAIL
done

# Пароль
ADMIN_PASSWORD=""
while [ ${#ADMIN_PASSWORD} -lt 8 ]; do
  echo -n "  Пароль администратора (мин. 8 символов): "
  read -rs ADMIN_PASSWORD
  echo ""
  if [ ${#ADMIN_PASSWORD} -lt 8 ]; then
    echo "  Минимум 8 символов!"
  fi
done

echo ""
echo -e "${GREEN}  Параметры приняты${NC}"

# ==================== ГЕНЕРАЦИЯ КОНФИГУРАЦИИ ====================

echo ""
echo -e "${YELLOW}[4/7] Генерация конфигурации...${NC}"

JWT_SECRET=$(openssl rand -hex 32)
DB_PASSWORD=$(openssl rand -hex 16)

if [ -n "$DOMAIN" ]; then
  FRONTEND_URL="https://${DOMAIN}"
else
  FRONTEND_URL="http://${SERVER_IP}:${PANEL_PORT}"
fi

cat > .env << EOF
DOMAIN=${DOMAIN:-$SERVER_IP}
NODE_ENV=production
PORT=3000
FRONTEND_URL=$FRONTEND_URL
JWT_SECRET=$JWT_SECRET
DATABASE_URL=postgresql://school:${DB_PASSWORD}@db:5432/school
POSTGRES_USER=school
POSTGRES_PASSWORD=$DB_PASSWORD
POSTGRES_DB=school
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@${DOMAIN:-$SERVER_IP}
SMTP_PASS=your_password_here
BACKUP_DIR=./backups
BACKUP_RETENTION_DAYS=7
EOF

cat > .setup-creds.json << EOF
{
  "email": "$ADMIN_EMAIL",
  "password": "$ADMIN_PASSWORD",
  "name": "Администратор"
}
EOF

chmod 600 .env .setup-creds.json
echo -e "${GREEN}  Конфигурация создана${NC}"

# ==================== CADDY ====================

echo -e "${YELLOW}[5/7] Настройка Caddy...${NC}"

if [ -n "$DOMAIN" ]; then
  cat > Caddyfile << CADDYEOF
$DOMAIN {
    reverse_proxy app:3000
    encode gzip
    header {
        Strict-Transport-Security max-age=31536000
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        Referrer-Policy strict-origin-when-cross-origin
    }
}
CADDYEOF
else
  cat > Caddyfile << 'CADDYEOF'
:80 {
    reverse_proxy app:3000
    encode gzip
}
CADDYEOF
fi
echo -e "${GREEN}  Caddy настроен${NC}"

# ==================== СБОРКА И ЗАПУСК ====================

echo ""
echo -e "${YELLOW}[6/7] Сборка и запуск...${NC}"

# Обновить порт в docker-compose.yml если нужно
if [ "$PANEL_PORT" != "80" ]; then
  # Используем python для надёжной замены
  python3 -c "
import re, sys
with open('docker-compose.yml', 'r') as f:
    content = f.read()
content = content.replace('- \"80:80\"', '- \"${PANEL_PORT}:80\"')
with open('docker-compose.yml', 'w') as f:
    f.write(content)
" 2>/dev/null || {
    # Fallback: grep и sed
    grep -q '"80:80"' docker-compose.yml && \
    sed -i "s/\"80:80\"/\"${PANEL_PORT}:80\"/g" docker-compose.yml
  }
fi

docker compose build -q 2>/dev/null || docker compose build
docker compose --env-file .env up -d
echo -e "${GREEN}  Сервисы запущены${NC}"

# ==================== ОЖИДАНИЕ ====================

echo ""
echo -e "${YELLOW}[7/7] Ожидание готовности...${NC}"

for i in $(seq 1 30); do
  if docker compose ps 2>/dev/null | grep -q "Up"; then
    break
  fi
  sleep 1
  printf "."
done
echo ""

# ==================== РЕЗУЛЬТАТ ====================

echo ""
echo "  ============================================"
echo "         Установка завершена успешно!"
echo "  ============================================"
echo ""

if [ -n "$DOMAIN" ]; then
  echo "  Домен:    https://${DOMAIN}/panel"
else
  echo "  Домен:    http://${SERVER_IP}:${PANEL_PORT}/panel"
fi

echo ""
FINAL_LOGIN="$ADMIN_EMAIL"
echo -n "  Введите логин: "
read -r FINAL_LOGIN
FINAL_LOGIN=${FINAL_LOGIN:-$ADMIN_EMAIL}

FINAL_PASSWORD=""
echo -n "  Введите пароль: "
read -rs FINAL_PASSWORD
echo ""
FINAL_PASSWORD=${FINAL_PASSWORD:-$ADMIN_PASSWORD}

echo ""
if [ -n "$DOMAIN" ]; then
  echo "  Откройте https://${DOMAIN}/panel"
else
  echo "  Откройте http://${SERVER_IP}:${PANEL_PORT}/panel"
fi
echo "  SSL-сертификат будет получен автоматически"

echo ""
echo "  Управление:"
echo "    cd $INSTALL_DIR"
echo "    docker compose logs -f          # логи"
echo "    docker compose restart           # перезапуск"
echo "    docker compose down              # остановка"
echo "    docker compose pull && docker compose up -d  # обновление"
echo ""
