#!/bin/bash
# School AI — Install Script (3x-ui style)
# Access panel at http://SERVER_IP:PORT/panel
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

clear
echo -e "${CYAN}"
echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║                                                  ║"
echo "  ║       ${BOLD}School AI — Установка${NC}${CYAN}                   ║"
echo "  ║       Интеллектуальная образовательная           ║"
echo "  ║             платформа                           ║"
echo "  ║                                                  ║"
echo "  ╚══════════════════════════════════════════════════╝"
echo -e "${NC}"

# ==================== ПРОВЕРКИ ====================

# Root check
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ОШИБКА] Запустите от root: sudo bash install.sh${NC}"
  exit 1
fi

# Detect OS
if ! grep -qiE 'ubuntu|debian' /etc/os-release 2>/dev/null; then
  echo -e "${YELLOW}[ПРЕДУПРЕЖДЕНИЕ] Скрипт тестировался на Ubuntu/Debian. Другие ОС могут работать некорректно.${NC}"
fi

# Get server IP
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "127.0.0.1")
echo -e "${BLUE}Обнаружен IP сервера: ${BOLD}$SERVER_IP${NC}"

# ==================== УСТАНОВКА DOCKER ====================

echo ""
echo -e "${YELLOW}[1/7] Проверка Docker...${NC}"

if command -v docker &> /dev/null; then
  echo -e "${GREEN}  ✓ Docker уже установлен: $(docker --version | head -1)${NC}"
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
  echo -e "${GREEN}  ✓ Docker установлен${NC}"
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
echo -e "${GREEN}  ✓ Проект: $INSTALL_DIR${NC}"

# ==================== ИНТЕРАКТИВНАЯ НАСТРОЙКА ====================

echo ""
echo -e "${YELLOW}[3/7] Настройка...${NC}"
echo ""
echo -e "${CYAN}  ┌──────────────────────────────────────────┐${NC}"
echo -e "${CYAN}  │  Настройте параметры вашего сервера       │${NC}"
echo -e "${CYAN}  └──────────────────────────────────────────┘${NC}"
echo ""

# Порт (по умолчанию 80)
read -p "  Порт для панели [80]: " PANEL_PORT
PANEL_PORT=${PANEL_PORT:-80}

# Домен (опционально)
echo ""
echo -e "  ${BLUE}Если у вас есть домен — введите его.${NC}"
echo -e "  ${BLUE}Если нет — нажмите Enter для IP-доступа.${NC}"
read -p "  Домен (опционально): " DOMAIN

# Email администратора
echo ""
read -p "  Email администратора: " ADMIN_EMAIL
while [ -z "$ADMIN_EMAIL" ]; do
  read -p "  Email обязателен: " ADMIN_EMAIL
done

# Пароль администратора
echo ""
read -s -p "  Пароль администратора (мин. 8 символов): " ADMIN_PASSWORD
echo ""
while [ ${#ADMIN_PASSWORD} -lt 8 ]; do
  read -s -p "  Минимум 8 символов: " ADMIN_PASSWORD
  echo ""
done

# Имя администратора
echo ""
read -p "  Имя администратора [Администратор]: " ADMIN_NAME
ADMIN_NAME=${ADMIN_NAME:-Администратор}

# ==================== ГЕНЕРАЦИЯ КОНФИГУРАЦИИ ====================

echo ""
echo -e "${YELLOW}[4/7] Генерация конфигурации...${NC}"

JWT_SECRET=$(openssl rand -hex 32)
DB_PASSWORD=$(openssl rand -hex 16)
POSTGRES_PASSWORD_VAL=$(openssl rand -hex 16)

if [ -n "$DOMAIN" ]; then
  FRONTEND_URL="https://${DOMAIN}"
else
  FRONTEND_URL="http://${SERVER_IP}:${PANEL_PORT}"
fi

# Определяем DATABASE_URL в зависимости от наличия домена
if [ -n "$DOMAIN" ]; then
  DATABASE_URL="postgresql://school:${DB_PASSWORD}@db:5432/school"
else
  DATABASE_URL="postgresql://school:${DB_PASSWORD}@db:5432/school"
fi

cat > .env << EOF
DOMAIN=${DOMAIN:-$SERVER_IP}
NODE_ENV=production
PORT=3000
FRONTEND_URL=$FRONTEND_URL
JWT_SECRET=$JWT_SECRET
DATABASE_URL=$DATABASE_URL
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

# Сохранить учётные данные (удалятся после первого входа)
cat > .setup-creds.json << EOF
{
  "email": "$ADMIN_EMAIL",
  "password": "$ADMIN_PASSWORD",
  "name": "$ADMIN_NAME"
}
EOF

chmod 600 .env .setup-creds.json

echo -e "${GREEN}  ✓ Конфигурация создана${NC}"

# ==================== НАСТРОЙКА CADDYFILE ====================

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
  echo -e "${GREEN}  ✓ Caddy настроен для $DOMAIN${NC}"
else
  # Без домена — Caddy не нужен, отдаём напрямую
  cat > Caddyfile << 'CADDYEOF'
:80 {
    reverse_proxy app:3000
    encode gzip
}
CADDYEOF
  echo -e "${GREEN}  ✓ Caddy настроен для IP-доступа${NC}"
fi

# ==================== СБОРКА И ЗАПУСК ====================

echo ""
echo -e "${YELLOW}[6/7] Сборка и запуск...${NC}"

# Обновить docker-compose.yml для порта
if [ "$PANEL_PORT" != "80" ]; then
  # Заменить порт Caddy
  sed -i "s/- \"80:80\"/- \"${PANEL_PORT}:80\"/g" docker-compose.yml
  sed -i "s/- \"443:443\"/- \"443:443\"/g" docker-compose.yml
fi

docker compose build -q 2>/dev/null || docker compose build
docker compose --env-file .env up -d

echo -e "${GREEN}  ✓ Сервисы запущены${NC}"

# ==================== ОЖИДАНИЕ ====================

echo ""
echo -e "${YELLOW}[7/7] Ожидание готовности...${NC}"

for i in {1..30}; do
  if docker compose ps 2>/dev/null | grep -q "Up"; then
    break
  fi
  sleep 1
  printf "."
done
echo ""

# ==================== РЕЗУЛЬТАТ ====================

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Установка завершена успешно!             ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}Панель управления:${NC}"

if [ -n "$DOMAIN" ]; then
  echo -e "    ${BLUE}https://${DOMAIN}/panel${NC}"
else
  echo -e "    ${BLUE}http://${SERVER_IP}:${PANEL_PORT}/panel${NC}"
fi

echo ""
echo -e "  ${BOLD}Учётные данные:${NC}"
echo -e "    Логин:    ${CYAN}$ADMIN_EMAIL${NC}"
echo -e "    Пароль:   ${CYAN}$ADMIN_PASSWORD${NC}"
echo ""
echo -e "  ${BOLD}Директория:${NC} $INSTALL_DIR"
echo ""
echo -e "  ${BOLD}Управление:${NC}"
echo -e "    cd $INSTALL_DIR"
echo -e "    docker compose logs -f          ${CYAN}# логи${NC}"
echo -e "    docker compose restart           ${CYAN}# перезапуск${NC}"
echo -e "    docker compose down              ${CYAN}# остановка${NC}"
echo -e "    docker compose pull && docker compose up -d  ${CYAN}# обновление${NC}"
echo ""

if [ -n "$DOMAIN" ]; then
  echo -e "  ${YELLOW}Убедитесь, что A-запись ${DOMAIN} ведёт на ${SERVER_IP}${NC}"
  echo -e "  ${YELLOW}SSL-сертификат будет получен автоматически${NC}"
else
  echo -e "  ${YELLOW}Откройте http://${SERVER_IP}:${PANEL_PORT}/panel в браузере${NC}"
fi

echo ""
