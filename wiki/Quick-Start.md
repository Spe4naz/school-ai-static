# Быстрый старт

Пошаговая инструкция по запуску проекта School AI на локальной машине.

---

## Требования

- **Node.js** 22+ (проверьте: `node -v`)
- **PostgreSQL** 16+ (или Docker)
- **npm** (входит в Node.js)

---

## Вариант 1: Локальный запуск (без Docker)

### 1. Клонируйте репозиторий

```bash
git clone https://github.com/your-org/school-ai-static.git
cd school-ai-static
```

### 2. Установите зависимости

```bash
npm install
```

### 3. Настройте переменные окружения

```bash
cp .env.example .env
```

Отредактируйте `.env` -- как минимум задайте:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/school_db
JWT_SECRET=your-super-secret-key-min-32-chars
DOMAIN=localhost
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3000
```

### 4. Создайте базу данных

```bash
# Если PostgreSQL уже запущен:
psql -U postgres -c "CREATE DATABASE school_db;"
```

### 5. Соберите фронтенд

```bash
npm run build:frontend
```

### 6. Запустите сервер

```bash
# Разработка (с hot-reload):
npm run dev

# Или продакшн:
npm run build
npm start
```

### 7. Откройте в браузере

```
http://localhost:3000
```

Войдите под тестовым аккаунтом: `admin@school.ru` / `123456`

---

## Вариант 2: Docker (рекомендуется)

### 1. Клонируйте и настройте

```bash
git clone https://github.com/your-org/school-ai-static.git
cd school-ai-static
cp .env.example .env
```

### 2. Запустите через Docker Compose

```bash
# Продакшн (Caddy + App + PostgreSQL):
npm run docker:up

# Разработка (с bind mount и hot-reload):
docker compose -f docker-compose.yml -f docker-compose.override.yml up
```

### 3. Откройте в браузере

```
https://localhost      # если настроен SSL
http://localhost:3000  # режим разработки
```

---

## Проверка работоспособности

```bash
# Health-check эндпоинт:
curl http://localhost:3000/api/health
```

Ответ:
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:00:00.000Z",
  "uptime": 123.456
}
```

---

## Основные команды

| Команда | Описание |
|---------|----------|
| `npm run dev` | Запуск в режиме разработки (hot-reload) |
| `npm run dev:all` | Сервер + фронтенд одновременно |
| `npm run build` | Сборка TypeScript + фронтенд |
| `npm start` | Запуск продакшн-версии |
| `npm test` | Запуск тестов |
| `npm run lint` | Проверка типов + ESLint |
| `npm run docker:up` | Запуск Docker Compose |
| `npm run docker:down` | Остановка Docker Compose |

---

## Тестовые данные

При первом запуске с пустой БД автоматически создаются:

- **2 класса**: "3А", "4Б"
- **4 пользователя**: admin, teacher, student, parent (пароль: `123456`)
- **Расписание**: полная неделя (Пн-Пт, 5 уроков в день)
- **Коды регистрации**: SCHOOL2024, ADMIN2024 и другие

---

## Возможные проблемы

### Ошибка подключения к БД

Убедитесь, что PostgreSQL запущен и доступен по указанному адресу в `DATABASE_URL`.

### Порт уже занят

Измените порт в `.env`:
```env
PORT=3001
```

### Ошибка сборки фронтента

Установите esbuild глобально или убедитесь, что он есть в `node_modules/.bin/`:
```bash
npx esbuild --version
```
