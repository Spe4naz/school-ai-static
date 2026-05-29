# API Reference

Полный справочник всех REST API эндпоинтов.

**Base URL**: `http://localhost:3000/api`

**Content-Type**: `application/json` (если не указано иное)

---

## Содержание

- [Публичные эндпоинты](#публичные-эндпоинты)
- [Эндпоинты аутентификации](#эндпоинты-аутентификации)
- [Оценки (Grades)](#оценки-grades)
- [Расписание (Schedule)](#расписание-schedule)
- [Чат (Chat)](#чат-chat)
- [Домашние задания (Homework)](#домашние-задания-homework)
- [Объявления (Announcements)](#объявления-announcements)
- [Уведомления (Notifications)](#уведомления-notifications)
- [Профиль (Profile)](#профиль-profile)
- [Отчёты (Reports)](#отчёты-reports)
- [Админ (Admin)](#админ-admin)
- [Коды ошибок](#коды-ошибок)

---

## Публичные эндпоинты

### Health Check

```
GET /api/health
```

**Ответ**:
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:00:00.000Z"
}
```

### Список классов

```
GET /api/classes
```

**Ответ**:
```json
[
  { "id": "uuid-3a", "name": "3А" },
  { "id": "uuid-4b", "name": "4Б" }
]
```

---

## Эндпоинты аутентификации

### Вход

```
POST /api/login
```

**Body**:
```json
{
  "email": "admin@school.ru",
  "password": "123456"
}
```

**Ответ**:
```json
{
  "user": {
    "id": "uuid",
    "name": "Админ",
    "role": "admin",
    "class_id": null,
    "linked_student_id": null
  }
}
```

Токены (access + refresh) устанавливаются как **httpOnly cookies** и не передаются в JSON-ответе.

**Rate limit**: 5 запросов / 15 минут на IP

### Регистрация

```
POST /api/register
```

**Body (ученик)**:
```json
{
  "email": "new@student.ru",
  "password": "securePass123",
  "name": "Иванов Пётр",
  "role": "student",
  "class_id": "uuid-3a"
}
```

**Body (родитель)**:
```json
{
  "email": "parent@family.ru",
  "password": "securePass123",
  "name": "Петрова Мария",
  "role": "parent",
  "linked_student_email": "ivan@school.ru"
}
```

**Body (учитель)**:
```json
{
  "email": "teacher@school.ru",
  "password": "securePass123",
  "name": "Иванова А.П.",
  "role": "teacher",
  "code": "SCHOOL2024"
}
```

**Ответ**: `{ "user": { ... } }` (токены в httpOnly cookies)

**Rate limit**: 3 запроса / 1 час на IP

### Обновление токена

```
POST /api/refresh
```

Refresh token передаётся в теле запроса или через httpOnly cookie.

**Body** (опционально — если не в cookie):
```json
{
  "refreshToken": "старый refreshToken"
}
```

**Ответ**:
```json
{
  "success": true
}
```

Новые токены устанавливаются как httpOnly cookies.

**Rate limit**: 10 запросов / 15 минут на IP

### Сброс пароля -- запрос

```
POST /api/password-reset/request
```

**Body**:
```json
{
  "email": "admin@school.ru"
}
```

**Ответ**:
```json
{
  "message": "Если аккаунт существует, письмо отправлено"
}
```

**Rate limit**: 3 запроса / 15 минут

### Сброс пароля -- подтверждение

```
POST /api/password-reset/confirm
```

**Body**:
```json
{
  "id": "reset-uuid",
  "email": "admin@school.ru",
  "newPassword": "newSecurePass123"
}
```

**Ответ**:
```json
{
  "message": "Пароль успешно изменён"
}
```

### Выход

```
POST /api/logout
```

Refresh token передаётся в теле запроса или через httpOnly cookie. Обе cookies очищаются.

**Body** (опционально):
```json
{
  "refreshToken": "токен для удаления"
}
```

**Ответ**:
```json
{
  "success": true,
  "message": "Выход выполнен"
}
```

### Смена пароля

```
POST /api/password/change
```

**Требуется авторизация**.

При смене пароля все refresh-токены пользователя аннулируются. Cookies очищаются.

**Body**:
```json
{
  "currentPassword": "старый пароль",
  "newPassword": "новый пароль (мин. 8 символов, строчные + заглавные + цифры)"
}
```

**Ответ**:
```json
{
  "success": true,
  "message": "Пароль изменён. Войдите заново."
}
```

---

## Оценки (Grades)

### Список оценок

```
GET /api/grades?week_offset=0
```

**Требуется авторизация**.

| Параметр | Тип | Описание |
|----------|-----|----------|
| `week_offset` | number | Смещение недели (0 = текущая, -1 = прошлая, +1 = следующая) |

**Поведение по ролям**:
- **student/parent**: показываются оценки ученика за указанную неделю
- **teacher**: показываются оценки по классу (нужен `class_id` в JWT)
- **admin**: все оценки с фильтрацией по классу

**Ответ**:
```json
{
  "grades": [
    {
      "id": 1,
      "student_id": "uuid",
      "student_name": "Петров Иван",
      "teacher_id": "uuid",
      "teacher_name": "Иванова А.П.",
      "subject": "Математика",
      "grade": 5,
      "comment": "Отлично!",
      "date": "2025-01-15"
    }
  ]
}
```

### Прогресс оценок

```
GET /api/grades/progress?subject=Математика&period=week
```

**Только для student/parent**.

| Параметр | Тип | Описание |
|----------|-----|----------|
| `subject` | string | Название предмета |
| `period` | string | `week`, `month` или `quarter` |

**Ответ**:
```json
{
  "progress": [
    { "date": "2025-01-13", "avg_grade": 4.5 },
    { "date": "2025-01-14", "avg_grade": 4.0 }
  ]
}
```

### Предметы ученика

```
GET /api/grades/subjects
```

**Только для student/parent**.

**Ответ**:
```json
{
  "subjects": ["Математика", "Русский язык", "Английский язык"]
}
```

### Создание оценки

```
POST /api/grades
```

**Требуется роль**: teacher или admin.

**Body**:
```json
{
  "student_id": "uuid-ученика",
  "subject": "Математика",
  "grade": 5,
  "comment": "Отличная работа!"
}
```

**Валидация**:
- `grade`: число от 2 до 5
- `subject`: непустая строка
- `student_id`: обязателен

**Ответ**:
```json
{
  "id": 1,
  "student_id": "uuid",
  "subject": "Математика",
  "grade": 5,
  "comment": "Отличная работа!"
}
```

### Статистика по классу

```
GET /api/grades/stats?class_id=uuid
```

**Требуется роль**: teacher или admin.

**Ответ**:
```json
{
  "average": 4.2,
  "count": 150,
  "distribution": {
    "5": 40,
    "4": 60,
    "3": 35,
    "2": 15
  }
}
```

---

## Расписание (Schedule)

### Список расписания

```
GET /api/schedule
```

**Требуется авторизация**.

**Поведение по ролям**:
- student/parent: автоматически фильтруется по `class_id`
- teacher: фильтрация по `class_id` или показ всех

**Ответ**:
```json
[
  {
    "id": 1,
    "day": "Пн",
    "time_slot": "08:30-09:15",
    "subject": "Математика",
    "teacher_id": "uuid",
    "teacher_name": "Иванова А.П.",
    "class_id": "uuid-3a",
    "class_name": "3А",
    "room": "101"
  }
]
```

### Создание расписания

```
POST /api/schedule
```

**Требуется роль**: teacher или admin.

**Body**:
```json
{
  "day": "Пн",
  "time_slot": "08:30-09:15",
  "subject": "Математика",
  "class_id": "uuid-3a",
  "room": "101"
}
```

### Обновление расписания

```
PUT /api/schedule/:id
```

**Требуется роль**: owner (создатель) или admin.

**Body** (частичное обновление):
```json
{
  "room": "202",
  "subject": "Алгебра"
}
```

### Удаление расписания

```
DELETE /api/schedule/:id
```

**Требуется роль**: owner или admin.

---

## Чат (Chat)

### Сообщения

```
GET /api/chat/messages?offset=0&limit=50
```

**Требуется авторизация**.

| Параметр | Тип | Описание |
|----------|-----|----------|
| `offset` | number | Смещение (для пагинации) |
| `limit` | number | Количество сообщений (макс. 50) |

**Ответ**:
```json
{
  "messages": [
    {
      "id": 1,
      "user_id": "uuid",
      "user_name": "Петров Иван",
      "user_role": "student",
      "content": "зашифрованное-содержимое",
      "image_url": null,
      "created_at": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

### Отправка сообщения

```
POST /api/chat/messages
```

**Body**:
```json
{
  "content": "зашифрованное-содержимое"
}
```

### Удаление сообщения

```
DELETE /api/chat/messages/:id
```

**Требуется авторизация**. Можно удалять только свои сообщения.

### Загрузка изображения

```
POST /api/chat/upload
```

**Content-Type**: `multipart/form-data`

**Поле**: `image` (файл)

**Ограничения**:
- Максимум 5 МБ
- Форматы: jpg, png, gif, webp
- Rate-limit: 10 загрузок / 10 минут

**Ответ**:
```json
{
  "url": "/uploads/filename.jpg"
}
```

### Ключ шифрования

```
GET /api/chat/key
```

Возвращает или создаёт AES-ключ для класса.

**Ответ**:
```json
{
  "key": "hex-encoded-64-chars"
}
```

### Участники чата

```
GET /api/chat/participants
```

**Ответ**:
```json
{
  "participants": [
    { "id": "uuid", "name": "Иванов И.И.", "role": "student" }
  ]
}
```

### Индикатор набора текста

```
POST /api/chat/typing    -- отправить "печатает"
GET  /api/chat/typing    -- получить кто печатает
```

---

## Домашние задания (Homework)

### Список заданий

```
GET /api/homework
```

**Требуется авторизация**.

**Ответ**:
```json
[
  {
    "id": 1,
    "class_id": "uuid-3a",
    "teacher_id": "uuid",
    "teacher_name": "Иванова А.П.",
    "subject": "Математика",
    "title": "Упр. 5-10",
    "description": "Решить задачи на стр. 45",
    "due_date": "2025-01-20",
    "created_at": "2025-01-15T10:00:00.000Z"
  }
]
```

### Создание задания

```
POST /api/homework
```

**Требуется роль**: teacher или admin.

**Body**:
```json
{
  "class_id": "uuid-3a",
  "subject": "Математика",
  "title": "Упр. 5-10",
  "description": "Решить задачи на стр. 45",
  "due_date": "2025-01-20"
}
```

### Удаление задания

```
DELETE /api/homework/:id
```

**Требуется роль**: owner (учитель, создавший задание) или admin.

---

## Объявления (Announcements)

### Список объявлений

```
GET /api/announcements
```

**Ответ**:
```json
[
  {
    "id": 1,
    "user_id": "uuid",
    "user_name": "Иванова А.П.",
    "title": "Родительское собрание",
    "content": "Приглашаем на собрание 20 января",
    "created_at": "2025-01-15T10:00:00.000Z"
  }
]
```

### Создание объявления

```
POST /api/announcements
```

**Требуется роль**: teacher или admin.

**Body**:
```json
{
  "title": "Родительское собрание",
  "content": "Приглашаем на собрание 20 января"
}
```

---

## Уведомления (Notifications)

### Список уведомлений

```
GET /api/notifications?limit=20
```

### Непрочитанные

```
GET /api/notifications/unread-count
```

**Ответ**:
```json
{
  "count": 5
}
```

### Отметить все как прочитанные

```
PUT /api/notifications/read
```

### SSE-поток (реалтайм)

```
GET /api/notifications/stream
```

Устанавливает long-lived SSE-соединение. Сервер отправляет heartbeat каждые 15 секунд.

**Ограничения**:
- CORS ограничен до `FRONTEND_URL`
- Максимум 3 соединения на пользователя
- Требуется httpOnly cookie с access token

**Формат событий**:
```
event: notification
data: {"id":1,"title":"Новая оценка","message":"Математика: 5"}

event: heartbeat
data: {}
```

---

## Профиль (Profile)

```
GET /api/profile
```

**Ответ**:
```json
{
  "id": "uuid",
  "email": "admin@school.ru",
  "name": "Админ",
  "role": "admin",
  "class_id": null,
  "class_name": null,
  "linked_student_id": null,
  "created_at": "2025-01-01T00:00:00.000Z",
  "last_login": "2025-01-15T10:00:00.000Z"
}
```

---

## Отчёты (Reports)

### Экспорт отчёта

```
GET /api/reports/export?class_id=uuid&format=pdf&period=month
```

**Требуется роль**: teacher или admin.

| Параметр | Тип | Описание |
|----------|-----|----------|
| `class_id` | string | ID класса |
| `format` | string | `pdf` или `excel` |
| `period` | string | `week`, `month`, `quarter` |

**Ответ**: Файл (PDF или XLSX) для скачивания.

---

## Админ (Admin)

Все эндпоинты требуют роль **admin**.

### Управление пользователями

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/api/admin/users` | Список пользователей (?role, ?class_id, ?q) |
| `GET` | `/api/admin/users/:id` | Один пользователь |
| `POST` | `/api/admin/users` | Создать пользователя |
| `PUT` | `/api/admin/users/:id` | Обновить пользователя |
| `DELETE` | `/api/admin/users/:id` | Удалить (нельзя удалить себя) |

### Управление классами

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/api/admin/classes` | Список классов |
| `POST` | `/api/admin/classes` | Создать класс |
| `PUT` | `/api/admin/classes/:id` | Обновить класс |
| `DELETE` | `/api/admin/classes/:id` | Удалить (если нет учеников) |

### Ученики

```
GET /api/admin/students?class_id=uuid
```

### Коды регистрации

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/api/admin/registration-codes` | Список кодов |
| `POST` | `/api/admin/registration-codes` | Создать код (?role) |
| `DELETE` | `/api/admin/registration-codes/:code` | Удалить код |

### Бэкапы

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/api/admin/backups` | Список бэкапов |
| `POST` | `/api/admin/backups` | Создать бэкап |
| `GET` | `/api/admin/backups/:name/download` | Скачать бэкап |
| `DELETE` | `/api/admin/backups/:name` | Удалить бэкап |

### Статистика

```
GET /api/admin/stats
```

**Ответ**:
```json
{
  "totalUsers": 25,
  "totalGrades": 1500,
  "totalClasses": 5,
  "lastBackup": "2025-01-15T10:00:00.000Z"
}
```

### Логи

```
GET /api/admin/logs?limit=50
```

### Настройки системы

```
GET /api/admin/settings
```

---

## Коды ошибок

| HTTP | Код | Описание |
|------|-----|----------|
| 400 | `MISSING_FIELDS` | Не все обязательные поля заполнены |
| 400 | `INVALID_EMAIL` | Неверный формат email |
| 400 | `WEAK_PASSWORD` | Пароль менее 8 символов или не соответствует требованиям сложности |
| 400 | `INVALID_GRADE` | Оценка вне диапазона 2-5 |
| 400 | `VALIDATION_ERROR` | Ошибка валидации параметра (например, невалидный UUID) |
| 401 | `AUTH_REQUIRED` | Токен отсутствует |
| 401 | `TOKEN_EXPIRED` | Токен истёк (нужен refresh) |
| 401 | `INVALID_TOKEN` | Невалидный refresh-токен |
| 403 | `FORBIDDEN` | Нет прав для выполнения операции |
| 403 | `TOKEN_INVALID` | Невалидный access-токен |
| 404 | `NOT_FOUND` | Пользователь или ресурс не найден |
| 409 | `EMAIL_EXISTS` | Email уже зарегистрирован |
| 409 | `CONFLICT` | Нарушение уникальности (PostgreSQL 23505) |
| 429 | `RATE_LIMITED` | Превышен rate-limit |
| 500 | `INTERNAL_ERROR` | Внутренняя ошибка сервера |
