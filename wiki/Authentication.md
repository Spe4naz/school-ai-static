# Аутентификация и авторизация

Подробное описание системы безопасности: JWT-токены, роли, регистрация, сброс пароля.

---

## Обзор

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────┐
│ Клиент   │────▶│  /api/login  │────▶│  PostgreSQL  │     │  Email   │
│          │◀────│  (JWT выдача)│◀────│  (users)     │     │ (SMTP)   │
│          │────▶│  /api/refresh│────▶│ (refresh_    │     │          │
│          │◀────│  (ротация)   │◀────│  tokens)     │     └──────────┘
│          │────▶│  Protected   │     └──────────────┘
│          │◀────│  Routes      │
└──────────┘     └──────────────┘

Ключевой момент: токены хранятся ТОЛЬКО в httpOnly cookies.
Фронтенд НЕ получает токен в JSON-ответе.
```

---

## JWT-токены

### Access Token

- **Срок жизни**: 24 часа
- **Алгоритм**: HS256 (зафиксирован в verify)
- **Issuer**: `school-ai`
- **Хранение**: httpOnly cookie

**Payload**:
```json
{
  "id": "user-uuid",
  "role": "admin|teacher|head_teacher|student|parent",
  "name": "Имя Пользователя",
  "class_id": "class-uuid | null",
  "linked_student_id": "student-uuid | null",
  "iss": "school-ai",
  "exp": 1705312800,
  "iat": 1705226400
}
```

### Refresh Token

- **Срок жизни**: 30 дней
- **Хранение**: в БД (таблица `refresh_tokens`) + httpOnly cookie
- **Использование**: одноразовый (consumed после использования)
- **Генерация**: 48 случайных байт → hex строка
- **Инвалидация**: при смене пароля все refresh-токены пользователя аннулируются

---

## Процесс входа (Login)

```
Клиент                          Сервер
  │                                │
  │  POST /api/login               │
  │  { email, password }           │
  │───────────────────────────────▶│
  │                                │  1. Zod-валидация
  │                                │  2. Поиск пользователя по email
  │                                │  3. bcrypt.compare(password, hash)
  │                                │  4. Обновление last_login
  │                                │  5. Генерация access token (24h)
  │                                │  6. Создание refresh token (30d)
  │                                │  7. Сохранение refresh token в БД
  │                                │  8. Установка httpOnly cookies
  │                                │
  │  Set-Cookie: token=...; HttpOnly
  │  Set-Cookie: refreshToken=...; HttpOnly
  │  { user: { id, name, role, ... } }
  │◀───────────────────────────────│
  │                                │
  │  GET /api/profile              │
  │  Cookie: token=...             │
  │───────────────────────────────▶│
  │                                │  9. Извлечение токена из cookie
  │                                │ 10. Верификация JWT
  │                                │ 11. req.user = payload
  │                                │
  │  Protected Route Response      │
  │◀───────────────────────────────│
```

---

## Процесс регистрации

### Ученик / Родитель (открытая регистрация)

```
Ученик:
  POST /api/register
  {
    "email": "student@school.ru",
    "password": "SecurePass123",
    "name": "Иванов Пётр",
    "role": "student",
    "class_id": "uuid-3a"
  }

Родитель:
  POST /api/register
  {
    "email": "parent@family.ru",
    "password": "SecurePass123",
    "name": "Петрова Мария",
    "role": "parent",
    "linked_student_email": "ivan@school.ru"
  }
```

### Учитель / Старший учитель (требуется код)

```
POST /api/register
{
  "email": "teacher@school.ru",
  "password": "SecurePass123",
  "name": "Иванова А.П.",
  "role": "teacher",
  "code": "SCHOOL2024"
}
```

Коды создаются администратором через `/api/admin/registration-codes`.

---

## Роли и доступ

### Иерархия ролей

```
admin (полный доступ)
  ├── head_teacher (управление пользователями)
  ├── teacher (оценки, расписание, задания, объявления)
  ├── student (просмотр данных)
  └── parent (просмотр данных ребёнка)
```

### Доступ к эндпоинтам по ролям

| Роль | Оценки (CR) | Оценки (R) | Расписание (CRUD) | Чат | Уведомления | Админ |
|------|:-----------:|:----------:|:-----------------:|:---:|:-----------:|:-----:|
| admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| head_teacher | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| teacher | ✅ | ✅ | ✅ (свои) | ✅ | ✅ | ❌ |
| student | ❌ | ✅ (свои) | ✅ (класс) | ✅ | ✅ | ❌ |
| parent | ❌ | ✅ (ребёнка) | ✅ (класс ребёнка) | ✅ (класс ребёнка) | ✅ | ❌ |

### Middleware проверки ролей

```typescript
// routes/admin.ts
router.get('/users', auth, roles('admin'), adminController.listUsers);

// routes/grades.ts
router.post('/', auth, roles('admin', 'teacher'), validate(createGradeSchema), gradeController.create);
```

---

## Сброс пароля

### Полная схема

```
1. Запрос сброса
   POST /api/password-reset/request
   { "email": "user@school.ru" }
   │
   ▼
2. Генерация токена
   - reset_token: 32 случайных байта → hex
   - reset_id: crypto.randomUUID()
   - expiry: текущее время + 1 час
   │
   ▼
3. Отправка email
   Ссылка: {FRONTEND_URL}/reset-password.html?id={resetId}&email={email}
   │
   ▼
4. Пользователь переходит по ссылке
   Вводит новый пароль
   │
   ▼
5. Подтверждение
   POST /api/password-reset/confirm
   { "id": "resetId", "email": "user@school.ru", "newPassword": "NewSecure123" }
   │
   ▼
6. Валидация
   - reset_id совпадает
   - email совпадает
   - токен не истёк
   │
   ▼
7. Обновление пароля
   bcrypt хеширование + очистка reset_token/reset_id
```

---

## Хранение токена на клиенте

```
┌─────────────────────────────────────────────┐
│  HTTP-only Cookie (token)                   │
│  - sameSite: strict                         │
│  - secure: true (в production)              │
│  - httpOnly: true                           │
│  - maxAge: 24 часа                          │
│                                             │
│  Используется для всех API-запросов         │
│  Фронтенд отправляет через credentials:     │
│  'same-origin'                              │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  HTTP-only Cookie (refreshToken)            │
│  - sameSite: strict                         │
│  - secure: true (в production)              │
│  - httpOnly: true                           │
│  - maxAge: 30 дней                          │
│                                             │
│  Используется для обновления access token   │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  localStorage (user)                        │
│  - Хранит только данные пользователя        │
│  - { id, name, role, class_id }             │
│  - НЕ содержит токен                        │
│  - Используется для UI-решений              │
└─────────────────────────────────────────────┘
```

### Важно

- **Токен НЕ передаётся** в JSON-ответе (раньше передавался — теперь нет)
- **Фронтенд** использует `credentials: 'same-origin'` вместо `Authorization: Bearer`
- **Bearer токен** всё ещё поддерживается для обратной совместимости (API-клиенты)
- **Logout** очищает обе cookies и аннулирует refresh-токен в БД

---

## Валидация (Zod)

Все входные данные проверяются через Zod-схемы в `middleware/validate.ts`:

```typescript
// Пример схемы входа
const loginSchema = z.object({
  email: z.string().email('Неверный формат email'),
  password: z.string().min(1, 'Пароль обязателен'),
});

// Пример схемы пароля (с требованиями сложности)
const passwordSchema = z.string()
  .min(8, 'Минимум 8 символов')
  .max(128)
  .regex(/[a-z]/, 'Хотя бы одна строчная буква')
  .regex(/[A-Z]/, 'Хотя бы одна заглавная буква')
  .regex(/[0-9]/, 'Хотя бы одна цифра');

// Пример схемы оценки
const createGradeSchema = z.object({
  student_id: z.string().uuid('Неверный формат ID'),
  subject: z.string().min(1, 'Предмет обязателен'),
  grade: z.number().int().min(2, 'Минимальная оценка 2').max(5, 'Максимальная оценка 5'),
  comment: z.string().optional(),
});
```

**Обработка ошибок Zod**:
- `INVALID_EMAIL` -- неверный формат email
- `WEAK_PASSWORD` -- пароль менее 8 символов или не соответствует требованиям сложности
- `MISSING_FIELDS` -- отсутствует обязательное поле
- `INVALID_GRADE` -- оценка вне диапазона 2-5
- `VALIDATION_ERROR` -- общая ошибка валидации

---

## Rate Limiting

| Лимит | Количество | Период | Применяется к |
|-------|-----------|--------|---------------|
| Login | 5 запросов | 15 мин | `POST /api/login` |
| Register | 3 запроса | 1 час | `POST /api/register` |
| Password Reset | 3 запроса | 15 мин | `POST /api/password-reset/request` |
| Refresh Token | 10 запросов | 15 мин | `POST /api/refresh` |
| API (глобальный) | 100 запросов | 10 мин | Все `/api/*` |
| Write (операции записи) | 30 запросов | 1 мин | POST/PUT/DELETE операции |
| Upload | 10 запросов | 10 мин | `POST /api/chat/upload` |
| Per-user | 60 запросов | 1 мин | Аутентифицированные эндпоинты |

Все лимиты отключаются в режиме `test`/`ci`.

---

## Примеры запросов с авторизацией

### cURL (cookie-based)

```bash
# Вход (cookies сохраняются автоматически)
curl -c cookies.txt -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@school.ru","password":"SecurePass123"}'

# Запрос с cookies
curl -b cookies.txt http://localhost:3000/api/profile

# Выход
curl -b cookies.txt -c cookies.txt -X POST http://localhost:3000/api/logout
```

### cURL (Bearer token — для API-клиентов)

```bash
# Вход
TOKEN=$(curl -s -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@school.ru","password":"SecurePass123"}' | jq -r '.token')

# Запрос с токеном (если токен доступен)
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/profile
```

### JavaScript (fetch — cookie-based)

```javascript
// Вход
const response = await fetch('/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@school.ru', password: 'SecurePass123' }),
  credentials: 'same-origin',
});
const { user } = await response.json();
// Cookies установлены автоматически

// Запрос (cookies отправляются автоматически)
const profile = await fetch('/api/profile', {
  credentials: 'same-origin',
});

// Выход
await fetch('/api/logout', {
  method: 'POST',
  credentials: 'same-origin',
});
```

---

## Обновление токена (Refresh)

```
Клиент                          Сервер
  │                                │
  │  POST /api/refresh             │
  │  Cookie: refreshToken=...      │
  │───────────────────────────────▶│
  │                                │  1. Извлечение refreshToken из cookie
  │                                │  2. Поиск в БД + проверка used/expiry
  │                                │  3. Пометка как used (одноразовый)
  │                                │  4. Генерация нового access token
  │                                │  5. Генерация нового refresh token
  │                                │  6. Установка новых cookies
  │                                │
  │  Set-Cookie: token=...; HttpOnly
  │  Set-Cookie: refreshToken=...; HttpOnly
  │  { success: true }
  │◀───────────────────────────────│
```

---

## Смена пароля

При смене пароля **все refresh-токены** пользователя аннулируются:

```
POST /api/password/change
Cookie: token=...
{
  "currentPassword": "старый пароль",
  "newPassword": "новый пароль"
}
│
▼
1. Проверка текущего пароля (bcrypt)
2. Хеширование нового пароля
3. Инвалидация ВСЕХ refresh-токенов пользователя
4. Очистка cookies (token + refreshToken)
5. Ответ: "Пароль изменён. Войдите заново."
```
