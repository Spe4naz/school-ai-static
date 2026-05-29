# School AI — Wiki

Интеллектуальная образовательная платформа. Электронный дневник с оценками, расписанием, чатом и системой уведомлений.

---

## Быстрый старт

```bash
# Автоматическая установка (Linux)
curl -fsSL https://raw.githubusercontent.com/Spe4naz/school-ai-static/main/install.sh | sudo bash

# Или вручную
git clone https://github.com/Spe4naz/school-ai-static.git
cd school-ai-static && npm install && npm run dev
```

---

## Содержание вики

### Основное

| Раздел | Описание |
|--------|----------|
| [Быстрый старт](Quick-Start.md) | Установка и запуск проекта |
| [Деплой](Deployment.md) | Развёртывание на сервере (Docker, SSL, Cloudflare) |
| [Конфигурация](Configuration.md) | Переменные окружения, настройки |

### Архитектура и код

| Раздел | Описание |
|--------|----------|
| [Архитектура](Architecture.md) | Структура проекта, middleware, зависимости |
| [База данных](Database.md) | Схема PostgreSQL, таблицы, индексы |
| [Фронтенд](Frontend.md) | Модули JS, CSS-компоненты, шифрование чата |
| [API Reference](API-Reference.md) | Все REST API эндпоинты |

### Безопасность и тестирование

| Раздел | Описание |
|--------|----------|
| [Безопасность](Security.md) | Аутентификация, шифрование, rate-limiting |
| [Аутентификация](Authentication.md) | JWT, роли, регистрация, сброс пароля |
| [Тестирование](Testing.md) | 164 теста, запуск, написание новых |

---

## Тестовые аккаунты

| Email | Пароль | Роль |
|-------|--------|------|
| admin@school.ru | 123456 | Администратор |
| teacher@school.ru | 123456 | Учитель |
| ivan@school.ru | 123456 | Ученик |
| parent@school.ru | 123456 | Родитель |

> Тестовые пароли не соответствуют требованиям к сложности.

## Стек

```
Backend:   Node.js + Express + TypeScript
Database:  PostgreSQL 16
Frontend:  Vanilla JS (ES Modules) + Chart.js
Proxy:     Caddy (авто-SSL)
Тесты:     Jest + Supertest + Testcontainers (222 теста)
Деплой:    Docker + Docker Compose (install.sh — 3x-ui стиль)
Безопасность: helmet + CSP nonces, JWT в httpOnly cookies, rate-limit, execFile для Docker
```
