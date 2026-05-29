# База данных

Полное описание схемы PostgreSQL, таблиц, индексов и миграций.

---

## Подключение

- **Движок**: PostgreSQL 16+
- **Драйвер**: `pg` Pool (макс. 20 соединений, таймаут запроса 10 сек)
- **Строка подключения**: переменная `DATABASE_URL`

```env
DATABASE_URL=postgresql://user:password@localhost:5432/school_db
```

---

## Таблицы

### classes

Школьные классы.

```sql
CREATE TABLE IF NOT EXISTS classes (
  id   TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);
```

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | TEXT (UUID) | Уникальный идентификатор |
| `name` | TEXT | Название класса (уникальное) |

### users

Все пользователи системы.

```sql
CREATE TABLE IF NOT EXISTS users (
  id                 TEXT PRIMARY KEY,
  email              TEXT UNIQUE NOT NULL,
  password           TEXT NOT NULL,
  name               TEXT NOT NULL,
  role               TEXT NOT NULL CHECK (role IN ('admin','teacher','head_teacher','student','parent')),
  class_id           TEXT REFERENCES classes(id),
  linked_student_id  TEXT REFERENCES users(id),
  reset_token        TEXT,
  reset_token_expiry TIMESTAMP,
  reset_id           TEXT,
  created_at         TIMESTAMP DEFAULT NOW(),
  last_login         TIMESTAMP
);
```

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | TEXT (UUID) | Уникальный идентификатор |
| `email` | TEXT | Email (уникальный) |
| `password` | TEXT | bcrypt-хеш пароля |
| `name` | TEXT | Имя пользователя |
| `role` | TEXT | Роль (admin, teacher, head_teacher, student, parent) |
| `class_id` | TEXT | FK → classes.id (для учеников) |
| `linked_student_id` | TEXT | FK → users.id (для родителей -- ссылка на ученика) |
| `reset_token` | TEXT | Токен сброса пароля |
| `reset_token_expiry` | TIMESTAMP | Срок действия токена сброса |
| `reset_id` | TEXT | ID операции сброса |
| `created_at` | TIMESTAMP | Дата создания |
| `last_login` | TIMESTAMP | Последний вход |

### grades

Оценки учеников.

```sql
CREATE TABLE IF NOT EXISTS grades (
  id          SERIAL PRIMARY KEY,
  student_id  TEXT NOT NULL REFERENCES users(id),
  teacher_id  TEXT NOT NULL REFERENCES users(id),
  subject     TEXT NOT NULL,
  grade       INTEGER NOT NULL CHECK (grade >= 2 AND grade <= 5),
  comment     TEXT,
  date        TEXT NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);
```

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | SERIAL | Автоинкремент |
| `student_id` | TEXT | FK → users.id (ученик) |
| `teacher_id` | TEXT | FK → users.id (учитель) |
| `subject` | TEXT | Название предмета |
| `grade` | INTEGER | Оценка (2-5) |
| `comment` | TEXT | Комментарий учителя |
| `date` | TEXT | Дата (YYYY-MM-DD) |
| `created_at` | TIMESTAMP | Дата создания записи |
| `updated_at` | TIMESTAMP | Дата обновления записи |

### schedule

Расписание уроков.

```sql
CREATE TABLE IF NOT EXISTS schedule (
  id         SERIAL PRIMARY KEY,
  day        TEXT NOT NULL,
  time_slot  TEXT NOT NULL,
  subject    TEXT NOT NULL,
  teacher_id TEXT NOT NULL REFERENCES users(id),
  class_id   TEXT NOT NULL REFERENCES classes(id),
  room       TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_schedule_unique
  ON schedule(day, time_slot, class_id, teacher_id);
```

| Колонка | Тип | Описание |
|---------|-----|----------|
| `day` | TEXT | День недели (Пн, Вт, Ср, Чт, Пт, Сб) |
| `time_slot` | TEXT | Временной слот (08:30-09:15) |
| `subject` | TEXT | Предмет |
| `teacher_id` | TEXT | FK → users.id |
| `class_id` | TEXT | FK → classes.id |
| `room` | TEXT | Кабинет |

### notifications

Уведомления пользователей.

```sql
CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  is_read    INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### messages

Сообщения чата (хранятся зашифрованными).

```sql
CREATE TABLE IF NOT EXISTS messages (
  id         SERIAL PRIMARY KEY,
  class_id   TEXT NOT NULL REFERENCES classes(id),
  user_id    TEXT NOT NULL REFERENCES users(id),
  content    TEXT NOT NULL,
  image_url  TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### class_keys

Ключи шифрования чата (по одному на класс).

```sql
CREATE TABLE IF NOT EXISTS class_keys (
  class_id       TEXT PRIMARY KEY REFERENCES classes(id),
  encryption_key TEXT NOT NULL
);
```

### chat_typing

Индикаторы набора текста (композитный PK).

```sql
CREATE TABLE IF NOT EXISTS chat_typing (
  class_id   TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  name       TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (class_id, user_id)
);
```

### homeworks

Домашние задания.

```sql
CREATE TABLE IF NOT EXISTS homeworks (
  id          SERIAL PRIMARY KEY,
  class_id    TEXT NOT NULL REFERENCES classes(id),
  teacher_id  TEXT NOT NULL REFERENCES users(id),
  subject     TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  due_date    TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);
```

### announcements

Школьные объявления.

```sql
CREATE TABLE IF NOT EXISTS announcements (
  id         SERIAL PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### registration_codes

Коды регистрации для учителей.

```sql
CREATE TABLE IF NOT EXISTS registration_codes (
  code       TEXT PRIMARY KEY,
  role       TEXT NOT NULL,
  used       INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### refresh_tokens

Refresh-токены (одноразовые).

```sql
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         SERIAL PRIMARY KEY,
  token      TEXT UNIQUE NOT NULL,
  user_id    TEXT NOT NULL REFERENCES users(id),
  used       INTEGER DEFAULT 0,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### logs

Аудит-лог действий.

```sql
CREATE TABLE IF NOT EXISTS logs (
  id        SERIAL PRIMARY KEY,
  user_id   TEXT NOT NULL,
  action    TEXT NOT NULL,
  details   TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

---

## Индексы

```sql
-- Пользователи
CREATE INDEX IF NOT EXISTS idx_users_class ON users(class_id);
CREATE INDEX IF NOT EXISTS idx_users_linked_student ON users(linked_student_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Оценки
CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_teacher ON grades(teacher_id);
CREATE INDEX IF NOT EXISTS idx_grades_student_date ON grades(student_id, date);
CREATE INDEX IF NOT EXISTS idx_grades_subject ON grades(subject);

-- Расписание
CREATE INDEX IF NOT EXISTS idx_schedule_class ON schedule(class_id);
CREATE INDEX IF NOT EXISTS idx_schedule_teacher ON schedule(teacher_id);

-- Уведомления
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- Сообщения
CREATE INDEX IF NOT EXISTS idx_messages_class ON messages(class_id);
CREATE INDEX IF NOT EXISTS idx_messages_class_created ON messages(class_id, created_at);

-- Домашние задания
CREATE INDEX IF NOT EXISTS idx_homeworks_class ON homeworks(class_id);
CREATE INDEX IF NOT EXISTS idx_homeworks_teacher ON homeworks(teacher_id);
CREATE INDEX IF NOT EXISTS idx_homeworks_class_due ON homeworks(class_id, due_date);

-- Refresh токены
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);
```

---

## Миграции

Миграции выполняются автоматически при старте сервера через `database.ts._migrate()`:

```typescript
// Пример миграции
await this.pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT');
await this.pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP');
```

Миграции **идемпотентны** -- повторный запуск не вызывает ошибок ("column already exists" игнорируется).

---

## Засевание (Seed Data)

При первом запуске с пустой БД создаются:

| Тип | Данные |
|-----|--------|
| Классы | "3А", "4Б" |
| Пользователи | admin, teacher, student, parent (пароль: `123456`) |
| Расписание | Пн-Пт, 5 уроков в день |
| Коды регистрации | SCHOOL2024, ADMIN2024, TEACH01, TEACH02, HEAD01 |
| Оценки | 1(sample) |

---

## Диаграмма связей

```
users ────────────┬──── grades.student_id
  │               ├──── grades.teacher_id
  │               ├──── schedule.teacher_id
  │               ├──── messages.user_id
  │               ├──── notifications.user_id
  │               ├──── homeworks.teacher_id
  │               ├──── announcements.user_id
  │               ├──── logs.user_id
  │               └──── refresh_tokens.user_id
  │
  ├──── users.class_id ──── classes.id
  └──── users.linked_student_id ──── users.id (рекурсивно)

classes ──────────┬──── schedule.class_id
                  ├──── messages.class_id
                  ├──── homeworks.class_id
                  └──── class_keys.class_id
```
