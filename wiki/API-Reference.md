# API Reference

Base URL: `http://localhost:3000/api`

---

## Health

```
GET /api/health
→ { "status": "ok", "timestamp": "..." }
```

---

## Setup (first-run)

```
GET  /api/setup/status   → { complete: boolean }
GET  /api/setup/config   → { domain, port, nodeEnv }
POST /api/setup/apply    → { domain, port, adminEmail, adminPassword, adminName }
```

---

## Auth

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/login` | Вход (токены в httpOnly cookies) |
| POST | `/api/register` | Регистрация (с кодом для teacher) |
| POST | `/api/logout` | Выход (очистка cookies) |
| POST | `/api/refresh` | Обновление токенов |
| POST | `/api/password/change` | Смена пароля + инвалидация refresh-токенов |
| POST | `/api/password-reset/request` | Запрос сброса |
| POST | `/api/password-reset/confirm` | Подтверждение сброса |

**Login response** (токены в Set-Cookie, не в body):
```json
{ "user": { "id": "uuid", "name": "...", "role": "admin", "class_id": null } }
```

---

## Profile

```
GET /api/profile → { id, email, name, role, class_id, class_name }
```

---

## Classes

```
GET /api/classes → [{ id, name }]  (кэш 5 мин)
```

---

## Grades

| Метод | Путь | Роль | Описание |
|-------|------|------|----------|
| GET | `/api/grades` | любая | Список оценок |
| POST | `/api/grades` | teacher+ | Создание оценки |
| GET | `/api/grades/subjects` | student/parent | Предметы |
| GET | `/api/grades/progress` | student/parent | Прогресс |

---

## Schedule

| Метод | Путь | Роль | Описание |
|-------|------|------|----------|
| GET | `/api/schedule` | любая | Список (кэш 2 мин) |
| POST | `/api/schedule` | teacher+ | Создание |
| PUT | `/api/schedule/:id` | owner/admin | Обновление |
| DELETE | `/api/schedule/:id` | owner/admin | Удаление |

---

## Chat

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/chat/messages` | Сообщения (пагинация) |
| POST | `/api/chat/messages` | Отправка сообщения |
| DELETE | `/api/chat/messages/:id` | Удаление сообщения |
| POST | `/api/chat/upload` | Загрузка изображения |
| GET | `/api/chat/key` | Ключ шифрования |
| GET | `/api/chat/participants` | Участники |

---

## Homework

| Метод | Путь | Роль | Описание |
|-------|------|------|----------|
| GET | `/api/homework` | любая | Список заданий |
| POST | `/api/homework` | teacher+ | Создание |
| DELETE | `/api/homework/:id` | owner/admin | Удаление |

---

## Announcements

| Метод | Путь | Роль | Описание |
|-------|------|------|----------|
| GET | `/api/announcements` | любая | Список (кэш 1 мин) |
| POST | `/api/announcements` | teacher+ | Создание |
| DELETE | `/api/announcements/:id` | admin | Удаление |

---

## Notifications

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/notifications` | Список уведомлений |
| GET | `/api/notifications/unread-count` | Количество непрочитанных |
| PUT | `/api/notifications/read` | Отметить все как прочитанные |
| GET | `/api/notifications/stream` | SSE (макс. 3/пользователь) |

---

## Reports

```
GET /api/reports/export?type=pdf&period=month&class_id=uuid
GET /api/reports/export?type=excel&period=month
```

---

## System (admin only)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/system/status` | Статус системы (БД, Docker, память, CPU) |
| GET | `/api/system/containers` | Список Docker контейнеров |
| GET | `/api/system/containers/:name/logs` | Логи контейнера |
| POST | `/api/system/containers/:name/restart` | Перезапуск контейнера |
| GET | `/api/system/logs` | Логи приложения |
| GET | `/api/system/config` | Конфигурация (маскированная) |
| GET | `/api/system/backups` | Список бэкапов |
| POST | `/api/system/backups` | Создать бэкап |

---

## Admin

Все эндпоинты требуют роль **admin**.

| Метод | Путь | Описание |
|-------|------|----------|
| GET/POST/PUT/DELETE | `/api/admin/users` | CRUD пользователей |
| GET/POST/PUT/DELETE | `/api/admin/classes` | CRUD классов |
| GET | `/api/admin/students` | Список учеников |
| GET/POST/DELETE | `/api/admin/registration-codes` | Коды регистрации |
| GET/POST/DELETE | `/api/admin/backups` | Бэкапы |
| GET | `/api/admin/logs` | Журнал действий |
| GET | `/api/admin/stats` | Статистика |

---

## Коды ошибок

| HTTP | Код | Описание |
|------|-----|----------|
| 400 | `MISSING_FIELDS` | Не все обязательные поля |
| 400 | `INVALID_EMAIL` | Неверный формат email |
| 400 | `WEAK_PASSWORD` | Пароль < 8 символов или без сложности |
| 400 | `INVALID_GRADE` | Оценка вне диапазона 2-5 |
| 401 | `AUTH_REQUIRED` | Токен отсутствует |
| 401 | `TOKEN_EXPIRED` | Токен истёк |
| 403 | `FORBIDDEN` | Нет прав |
| 403 | `TOKEN_INVALID` | Невалидный токен |
| 404 | `NOT_FOUND` | Ресурс не найден |
| 409 | `EMAIL_EXISTS` | Email уже зарегистрирован |
| 429 | `RATE_LIMITED` | Превышен лимит |
| 500 | `INTERNAL_ERROR` | Внутренняя ошибка |
