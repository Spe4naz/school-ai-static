# Фронтенд

Vanilla JS (ES Modules) + Chart.js. Сборка через ESBuild.

---

## Структура

```
public/
├── js/                     # ES Modules
│   ├── main.js             # Точка входа
│   ├── dashboard.js        # Контроллер дашборда
│   ├── utils.js            # Утилиты (escapeHtml, apiFetch, showToast, showConfirm, debounce, getRoleLabel)
│   ├── chat.js             # Чат с шифрованием
│   ├── grades.js           # Оценки
│   ├── schedule.js         # Расписание
│   ├── homework.js         # Домашние задания
│   ├── notifications.js    # Уведомления
│   ├── profile.js          # Профиль
│   ├── charts.js           # Графики (Chart.js)
│   ├── admin.js            # Админ-модуль
│   ├── export.js           # Экспорт отчётов
│   ├── logs.js             # Аудит-логи
│   └── announcements.js    # Объявления
├── style.css               # CSS (переменные, тёмная тема, компоненты)
├── dashboard.bundle.js     # Собранный бандл (esbuild)
├── dashboard.html          # Основной SPA
├── admin-panel.html        # Админ-панель SPA
├── setup.html              # Setup wizard
├── index.html              # Страница входа
├── register.html           # Регистрация
├── reset-password.html     # Сброс пароля
└── uploads/                # Загруженные изображения
```

---

## Сборка

```bash
npm run build:frontend   # Продакшн (минифицированный)
npm run build:dev        # Разработка (sourcemaps)
npm run watch:frontend   # Watch-режим
```

---

## Утилиты (utils.js)

```javascript
import { showToast, showConfirm, escapeHtml, debounce, getRoleLabel, API } from './utils.js';

showToast('Успешно!', 'success');           // Toast-уведомление
const ok = await showConfirm('Удалить?');   // Модальное подтверждение
escapeHtml('<script>');                     // XSS-защита
debounce(fn, 300);                          // Задержка вызова
getRoleLabel('admin');                      // 'Администратор'
```

---

## Аутентификация (cookie-based)

Фронтенд использует `credentials: 'same-origin'` вместо Bearer-токенов:

```javascript
// Вход
const res = await fetch('/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
  credentials: 'same-origin',
});

// Запросы (cookies отправляются автоматически)
const res = await fetch('/api/profile', { credentials: 'same-origin' });
```

---

## Шифрование чата

Клиентское AES-256-GCM через Web Crypto API:

```
Ключ класса (64 hex) → PBKDF2 (100K итераций) → AES-256-GCM
  → Зашифрование: plaintext → iv + ciphertext
  → Расшифрование: iv + ciphertext → plaintext
```

---

## CSS-компоненты

```css
.toast-*           /* Toast-уведомления (success, error, info, warning) */
.confirm-overlay   /* Модальное подтверждение */
.card-item         /* Карточка элемента */
.badge-*           /* Бейджи (danger, success, warning, info) */
.btn-icon-sm       /* Кнопка-иконка */
.loading-spinner   /* Спиннер загрузки */
```

---

## Автообновление

| Интервал | Данные |
|----------|--------|
| SSE | Уведомления (real-time) |
| 15 сек | Непрочитанные уведомления |
| 30 сек | Статистика, расписание, объявления |

---

## Внешние зависимости

| Библиотека | Источник | Использование |
|------------|----------|---------------|
| Chart.js | CDN | Графики оценок |
| BoxIcons | CDN | Иконки (dashboard) |
| Tabler Icons | CDN | Иконки (admin-panel) |
| Web Crypto API | Браузер | Шифрование чата |
