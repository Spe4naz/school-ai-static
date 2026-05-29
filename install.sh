#!/bin/bash
# School AI — Quick Install Script for Linux
# Usage: curl -sSL <url>/install.sh | bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "  ╔══════════════════════════════════════╗"
echo "  ║       School AI — Установка          ║"
echo "  ║  Интеллектуальная образовательная    ║"
echo "  ║           платформа                  ║"
echo "  ╚══════════════════════════════════════╝"
echo -e "${NC}"

# Check root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Запустите от root: sudo bash install.sh${NC}"
  exit 1
fi

# Install Docker
echo -e "${YELLOW}[1/6] Установка Docker...${NC}"
if ! command -v docker &> /dev/null; then
  apt-get update
  apt-get install -y ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  systemctl enable docker
  systemctl start docker
  echo -e "${GREEN}Docker установлен${NC}"
else
  echo -e "${GREEN}Docker уже установлен${NC}"
fi

# Clone project
echo -e "${YELLOW}[2/6] Клонирование проекта...${NC}"
INSTALL_DIR="/opt/school-ai"
if [ -d "$INSTALL_DIR" ]; then
  echo -e "${YELLOW}Директория $INSTALL_DIR уже существует. Обновляю...${NC}"
  cd "$INSTALL_DIR"
  git pull
else
  git clone https://github.com/Spe4naz/school-ai-static.git "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

# Create .env
echo -e "${YELLOW}[3/6] Настройка окружения...${NC}"
if [ ! -f .env ]; then
  cp .env.example .env
fi

# Interactive setup
echo ""
echo -e "${BLUE}Введите параметры настройки:${NC}"
echo ""

read -p "Домен (например, school.example.com): " DOMAIN
read -p "Порт [3000]: " PORT
PORT=${PORT:-3000}
read -p "Email администратора: " ADMIN_EMAIL
read -s -p "Пароль администратора (мин. 8 символов): " ADMIN_PASSWORD
echo ""
read -p "Имя администратора: " ADMIN_NAME

# Generate JWT secret
JWT_SECRET=$(openssl rand -hex 32)

# Write .env
cat > .env << EOF
DOMAIN=$DOMAIN
NODE_ENV=production
PORT=$PORT
FRONTEND_URL=https://$DOMAIN
JWT_SECRET=$JWT_SECRET
DATABASE_URL=postgresql://school:school_pass@db:5432/school
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@$DOMAIN
SMTP_PASS=your_password_here
BACKUP_DIR=./backups
BACKUP_RETENTION_DAYS=7
POSTGRES_PASSWORD=$(openssl rand -hex 16)
EOF

# Store admin credentials for seeding
cat > .setup-creds.json << EOF
{
  "email": "$ADMIN_EMAIL",
  "password": "$ADMIN_PASSWORD",
  "name": "$ADMIN_NAME"
}
EOF

echo -e "${GREEN}Конфигурация создана${NC}"

# Build and start
echo -e "${YELLOW}[4/6] Сборка проекта...${NC}"
docker compose build

echo -e "${YELLOW}[5/6] Запуск сервисов...${NC}"
docker compose --env-file .env up -d

echo -e "${YELLOW}[6/6] Ожидание готовности...${NC}"
sleep 10

# Check status
if docker compose ps | grep -q "Up"; then
  echo ""
  echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║       Установка завершена!           ║${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
  echo ""
  echo -e "  Домен:    ${BLUE}https://$DOMAIN${NC}"
  echo -e "  Логин:    ${BLUE}$ADMIN_EMAIL${NC}"
  echo -e "  Пароль:   ${BLUE}$ADMIN_PASSWORD${NC}"
  echo ""
  echo -e "  ${YELLOW}Откройте https://$DOMAIN в браузере${NC}"
  echo -e "  ${YELLOW}SSL-сертификат будет получен автоматически${NC}"
  echo ""
  echo -e "  Управление:"
  echo -e "    cd $INSTALL_DIR"
  echo -e "    docker compose logs -f        # логи"
  echo -e "    docker compose restart         # перезапуск"
  echo -e "    docker compose down            # остановка"
  echo ""
else
  echo -e "${RED}Ошибка запуска. Проверьте логи: docker compose logs${NC}"
  exit 1
fi
