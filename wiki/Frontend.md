# Фронтенд

Описание клиентской части проекта: страницы, модули, шифрование чата.

---

## Архитектура

```
public/
├── index.html              # Страница входа
├── register.html           # Страница регистрации
├── reset-password.html     # Сброс пароля (3 шага)
├── dashboard.html          # Основной SPA (для всех ролей)
├── admin-panel.html        # Админ-панель SPA
├── style.css               # Глобальные стили (CSS-переменные, тёмная тема)
├── dashboard.bundle.js     # Собранный бандл (esbuild)
├── uploads/                # Загруженные изображения
└── js/                     # Исходники фронтенда (ES Modules)
    ├── main.js             # Точка входа
    ├── dashboard.js        # Контроллер дашборда
    ├── utils.js            # Общие утилиты
    ├── chat.js             # Чат с шифрованием
    ├── grades.js           # Оценки
    ├── schedule.js         # Расписание
    ├── homework.js         # Домашние задания
    ├── notifications.js    # Уведомления
    ├── profile.js          # Профиль пользователя
    ├── charts.js           # Графики (Chart.js)
    ├── admin.js            # Админ-модуль
    ├── export.js           # Экспорт отчётов
    ├── logs.js             # Аудит-логи
    └── announcements.js    # Объявления
```

---

## Сборка

Фронтенд собирается через **esbuild**:

```bash
# Продакшн (минифицированный)
npm run build:frontend

# Разработка (с sourcemaps)
npm run build:dev

# Watch-режим
npm run watch:frontend
```

Входная точка: `public/js/main.js` → `public/dashboard.bundle.js`

---

## Страницы

### index.html (Вход)

Простая форма входа с полями email и password. Отправляет `POST /api/login`. При успехе перенаправляет на `dashboard.html`.

### register.html (Регистрация)

Динамическая форма, меняющаяся в зависимости от роли:

| Роль | Дополнительные поля |
|------|-------------------|
| student | Выбор класса (из `GET /api/classes`) |
| parent | Email ребёнка (`linked_student_email`) |
| teacher / head_teacher | Код регистрации |

### reset-password.html (Сброс пароля)

3-шаговый процесс:

```
1. Ввод email → POST /api/password-reset/request
2. Ввод нового пароля (с индикатором сложности) → POST /api/password-reset/confirm
3. Сообщение об успехе
```

### dashboard.html (Основной SPA)

Единая страница с боковой навигацией. Секции:

| Секция | Описание | Роли |
|--------|----------|------|
| home | Дашборд с виджетами | Все |
| diary | Электронный дневник (оценки) | student, parent |
| homework | Домашние задания | Все |
| schedule | Расписание | Все |
| chat | Классный чат | Все |
| charts | Графики прогресса | student, parent |
| notifications | Уведомления | Все |
| profile | Профиль пользователя | Все |
| users | Управление пользователями | admin, head_teacher |
| logs | Аудит-логи | admin |
| announcements | Объявления | Все |

### admin-panel.html (Админ-панель)

Отдельная SPA для администраторов со своей навигацией:

- Dashboard (статистика)
- Пользователи (CRUD)
- Классы (CRUD)
- Оценки (просмотр)
- Расписание (просмотр)
- Коды регистрации
- Бэкапы
- Логи
- Настройки

---

## Модули фронтенда

### dashboard.js -- Контроллер

```javascript
// Управляет навигацией, SSE, автообновлением
export function initDashboard(user) {
  // Инициализация SSE для уведомлений
  // Запуск интервалов (30 сек: уведомления, статистика, оценки)
  // Навигация по секциям
}
```

### utils.js -- Утилиты

```javascript
export function escapeHtml(text)           // XSS-защита
export function apiFetch(url, options)     // Обёртка для fetch (credentials: same-origin)
export function startInterval(key, fn, ms) // Управление интервалами
export function clearAllIntervals()        // Очистка всех интервалов
```

### chat.js -- Чат с шифрованием

Клиентское шифрование сообщений через Web Crypto API:

```
Отправка:
  1. Получить ключ класса (GET /api/chat/key)
  2. Импортировать ключ (PBKDF2, 100000 итераций)
  3. Зашифровать сообщение (AES-256-GCM)
  4. Отправить зашифрованный контент (POST /api/chat/messages)

Получение:
  1. Получить ключ класса
  2. Получить сообщения (GET /api/chat/messages)
  3. Расшифровать каждое сообщение
  4. Отобразить
```

### grades.js -- Оценки

- Таблица оценок с навигацией по неделям (week_offset)
- Отправка новых оценок (для учителей)
- Фильтрация по предметам

### charts.js -- Графики

Использует **Chart.js** для визуализации прогресса:

- Линейный график средних оценок по времени
- Фильтрация по предмету и периоду (неделя/мес/четверть)

### homework.js -- Домашние задания

- Список заданий с дедлайнами
- Создание заданий (для учителей)
- Удаление (для создателя/админа)

### notifications.js -- Уведомления

- Список уведомлений
- Количество непрочитанных
- SSE для реалтайм-обновлений

### export.js -- Экспорт

- Экспорт оценок в PDF (через `/api/reports/export?format=pdf`)
- Экспорт оценок в Excel (через `/api/reports/export?format=excel`)

---

## Стили

Файл: `public/style.css`

### CSS-переменные

```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #333333;
  --text-secondary: #666666;
  --accent: #4a90d9;
  --border: #e0e0e0;
  --success: #28a745;
  --danger: #dc3545;
  --warning: #ffc107;
}
```

### Тёмная тема

Переключение через `[data-theme="dark"]`, сохраняется в `localStorage`.

```css
[data-theme="dark"] {
  --bg-primary: #1a1a2e;
  --bg-secondary: #16213e;
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0a0;
  --border: #333333;
}
```

### Иконки

Используются **BoxIcons** (CDN).

---

## Внешние зависимости

| Библиотека | Источник | Использование |
|------------|----------|---------------|
| Chart.js | CDN | Графики оценок |
| BoxIcons | CDN | Иконки |
| Web Crypto API | Браузер | Шифрование чата |

---

## Автообновление

Фронтенд использует интервалы для обновления данных:

| Интервал | Данные | Период |
|----------|--------|--------|
| Уведомления | `GET /api/notifications/unread-count` | 30 сек |
| Статистика | `GET /api/admin/stats` | 30 сек |
| Оценки | `GET /api/grades` | 30 сек |

Все интервалы очищаются при навигации или выходе.

---

## SSE (Server-Sent Events)

Подключение к `/api/notifications/stream`. Аутентификация через httpOnly cookie:

```javascript
const eventSource = new EventSource('/api/notifications/stream');
// Cookie с token отправляется автоматически (same-origin)

eventSource.addEventListener('notification', (event) => {
  const data = JSON.parse(event.data);
  // Обновить UI уведомлений
});

eventSource.addEventListener('heartbeat', () => {
  // Keep-alive, ничего не делать
});

eventSource.onerror = () => {
  // Автопереподключение (встроено в EventSource)
};
```
