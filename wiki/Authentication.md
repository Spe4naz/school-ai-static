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
```

---

## JWT-токены

### Access Token

- **Срок жизни**: 24 часа
- **Алгоритм**: HS256
- **Issuer**: `school-ai`

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
- **Хранение**: в БД (таблица `refresh_tokens`)
- **Использование**: одноразовый (consumed после использования)
- **Генерация**: 48 случайных байт → hex строка

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
  │                                │
  │  { token, refreshToken, user } │
  │◀───────────────────────────────│
  │                                │
  │  Authorization: Bearer <token> │
  │───────────────────────────────▶│
  │                                │  8. Верификация JWT
  │                                │  9. req.user = payload
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
    "password": "securePass",
    "name": "Иванов Пётр",
    "role": "student",
    "class_id": "uuid-3a"
  }

Родитель:
  POST /api/register
  {
    "email": "parent@family.ru",
    "password": "securePass",
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
  "password": "securePass",
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
   { "id": "resetId", "email": "user@school.ru", "newPassword": "newPass" }
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
│  - path: /                                  │
│                                             │
│  Используется для SSE иookie-based auth     │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  Authorization Header (Bearer token)        │
│  - Используется для API-запросов            │
│  - Отправляется в каждом запросе            │
└─────────────────────────────────────────────┘
```

---

## Валидация (Zod)

Все входные данные проверяются через Zod-схемы в `middleware/validate.ts`:

```typescript
// Пример схемы входа
const loginSchema = z.object({
  email: z.string().email('Неверный формат email'),
  password: z.string().min(1, 'Пароль обязателен'),
});

// Пример схемы оценки
const createGradeSchema = z.object({
  student_id: z.string().min(1, 'ID ученика обязателен'),
  subject: z.string().min(1, 'Предмет обязателен'),
  grade: z.number().int().min(2, 'Минимальная оценка 2').max(5, 'Максимальная оценка 5'),
  comment: z.string().optional(),
});
```

**Обработка ошибок Zod**:
- `INVALID_EMAIL` -- неверный формат email
- `WEAK_PASSWORD` -- пароль менее 6 символов
- `MISSING_FIELDS` -- отсутствует обязательное поле
- `INVALID_GRADE` -- оценка вне диапазона 2-5

---

## Rate Limiting

| Лимит | Количество | Период | Применяется к |
|-------|-----------|--------|---------------|
| Login | 5 запросов | 15 мин | `POST /api/login` |
| Register | 3 запроса | 1 час | `POST /api/register` |
| Password Reset | 3 запроса | 15 мин | `POST /api/password-reset/request` |
| API (глобальный) | 100 запросов | 10 мин | Все `/api/*` |
| Write (операции записи) | 30 запросов | 1 мин | POST/PUT/DELETE операции |

Все лимиты отключаются в режиме `test`/`ci`.

---

## Примеры запросов с авторизацией

### cURL

```bash
# Вход
TOKEN=$(curl -s -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@school.ru","password":"123456"}' | jq -r '.token')

# Запрос с токеном
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/profile
```

### JavaScript (fetch)

```javascript
// Вход
const response = await fetch('/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@school.ru', password: '123456' }),
});
const { token, refreshToken, user } = await response.json();

// Запрос с токеном
const profile = await fetch('/api/profile', {
  headers: { 'Authorization': `Bearer ${token}` },
});
```
