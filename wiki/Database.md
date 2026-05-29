# База данных

PostgreSQL 16+. Параметризованные запросы через `pg` Pool.

---

## Подключение

```env
DATABASE_URL=postgresql://user:password@localhost:5432/school
```

Pool: max=20, min=2, idleTimeout=30s, queryTimeout=10s.

---

## Таблицы

| Таблица | Описание |
|---------|----------|
| `classes` | Школьные классы |
| `users` | Пользователи (5 ролей) |
| `grades` | Оценки учеников |
| `schedule` | Расписание уроков |
| `messages` | Сообщения чата (зашифрованы) |
| `class_keys` | Ключи шифрования чата |
| `chat_typing` | Индикаторы набора текста |
| `notifications` | Уведомления |
| `homeworks` | Домашние задания |
| `announcements` | Объявления |
| `registration_codes` | Коды регистрации |
| `refresh_tokens` | Refresh-токены (одноразовые) |
| `logs` | Аудит-лог |

---

## Ключевые связи

```
users ──┬── grades.student_id / teacher_id
        ├── schedule.teacher_id
        ├── messages.user_id
        ├── notifications.user_id
        ├── homeworks.teacher_id
        ├── announcements.user_id
        ├── logs.user_id
        └── refresh_tokens.user_id

classes ──┬── schedule.class_id
          ├── messages.class_id
          ├── homeworks.class_id
          └── class_keys.class_id
```

---

## Индексы

```sql
-- users
CREATE INDEX idx_users_class ON users(class_id);
CREATE INDEX idx_users_role ON users(role);

-- grades
CREATE INDEX idx_grades_student ON grades(student_id);
CREATE INDEX idx_grades_student_date ON grades(student_id, date);

-- schedule
CREATE UNIQUE INDEX idx_schedule_unique ON schedule(day, time_slot, class_id, teacher_id);

-- notifications
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);

-- messages
CREATE INDEX idx_messages_class_created ON messages(class_id, created_at);

-- refresh_tokens
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);
```

---

## Миграции

Выполняются автоматически при старте (`database.ts._migrate()`). Идемпотентны — повторный запуск безопасен.

---

## Seed Data

При первом запуске с пустой БД создаются:
- 2 класса: "3А", "4Б"
- 4 пользователя (admin, teacher, student, parent)
- Расписание на неделю
- 5 кодов регистрации
- 1 оценка
