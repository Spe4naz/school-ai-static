# Быстрый старт

Запуск School AI на локальной машине.

---

## Требования

- Node.js 20+
- PostgreSQL 16+ (или Docker)

---

## Установка

### 1. Клонировать

```bash
git clone https://github.com/Spe4naz/school-ai-static.git
cd school-ai-static
```

### 2. Установить зависимости

```bash
npm install
```

### 3. Настроить окружение

```bash
cp .env.example .env
```

Отредактировать `.env`:

```env
DATABASE_URL=postgresql://school:school_pass@localhost:5432/school
JWT_SECRET=your-secret-key-min-32-chars
DOMAIN=localhost
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3000
```

### 4. Создать базу данных

```bash
psql -U postgres -c "CREATE USER school WITH PASSWORD 'school_pass' CREATEDB;"
psql -U postgres -c "CREATE DATABASE school OWNER school;"
```

### 5. Собрать и запустить

```bash
npm run build
npm run dev
```

### 6. Открыть в браузере

http://localhost:3000

---

## Docker (альтернатива)

```bash
cp .env.example .env
# отредактировать .env
docker compose --env-file .env up -d
```

---

## Тестовые аккаунты

| Email | Пароль | Роль |
|-------|--------|------|
| admin@school.ru | 123456 | Администратор |
| teacher@school.ru | 123456 | Учитель |
| ivan@school.ru | 123456 | Ученик |
| parent@school.ru | 123456 | Родитель |

> Тестовые пароли не соответствуют требованиям к сложности.

---

## Команды разработки

```bash
npm run dev            # сервер с hot-reload
npm run dev:all        # сервер + фронтенд
npm run build          # сборка TS + frontend
npm run lint           # tsc + eslint
npm run test           # тесты (Docker)
npm run test:coverage  # покрытие
```
