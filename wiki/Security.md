# Безопасность

Обзор мер безопасности, реализованных в проекте School AI.

---

## Обзор

```
┌─────────────────────────────────────────────────────┐
│                   УРОВНИ ЗАЩИТЫ                     │
├─────────────────────────────────────────────────────┤
│  1. Сеть:       Caddy (SSL, HSTS,安全ные заголовки)│
│  2. Авторизация: JWT + Refresh Tokens              │
│  3. Данные:     bcrypt паролей, AES-256-GCM чата   │
│  4. Валидация:  Zod-схемы для всех входных данных  │
│  5. Rate-limit: Защита от brute-force и DDoS       │
│  6. SQL:        Параметризованные запросы           │
│  7. XSS:        escapeHtml + CSP + Helmet           │
│  8. Файлы:      Проверка типов и размера           │
└─────────────────────────────────────────────────────┘
```

---

## Аутентификация

### JWT (JSON Web Tokens)

- **Алгоритм**: HS256 (HMAC-SHA256)
- **Срок жизни access token**: 24 часа
- **Issuer claim**: `school-ai` (проверяется при верификации)

### Refresh Tokens

- **Срок жизни**: 30 дней
- **Использование**: одноразовый (consumed после каждого использования)
- **Хранение**: в БД (таблица `refresh_tokens`)
- **Генерация**: 48 криптографически стойких случайных байт

### Пароли

- **Хеширование**: bcrypt
- **Раунды**: 12 (production) / 8 (development)
- **Отказ от дефолтных секретов**: сервер проверяет и отклоняет известные JWT-секреты

---

## Rate Limiting

| Лимит | Лимит | Окно | Область |
|-------|-------|------|---------|
| Вход | 5 запросов | 15 мин | IP |
| Регистрация | 3 запроса | 1 час | IP |
| Сброс пароля | 3 запроса | 15 мин | IP |
| API (глобальный) | 100 запросов | 10 мин | IP |
| Запись (POST/PUT/DELETE) | 30 запросов | 1 мин | IP |

Все лимиты отключаются в `test`/`ci` режимах.

---

## Защита HTTP-заголовков (Helmet)

```javascript
helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],   // Chart.js CDN
      styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],  // BoxIcons
      imgSrc: ["'self'", "data:", "blob:"],
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  frameguard: { action: 'deny' },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
})
```

---

## Шифрование чата

Клиентское шифрование через Web Crypto API:

```
Ключ класса (64 hex-символа)
    │
    ▼
PBKDF2 (100,000 итераций, SHA-256)
    │
    ▼
CryptoKey (AES-256-GCM)
    │
    ├──▶ Зашифрование: plaintext → iv + authTag + ciphertext
    │
    └──▶ Расшифрование: iv + authTag + ciphertext → plaintext
```

**Ключевые особенности**:
- Сервер хранит только зашифрованные сообщения
- Ключ генерируется на клиенте и передаётся через `/api/chat/key`
- Каждое сообщение использует уникальный IV (Initialization Vector)
- Fallback на открытый текст при ошибке шифрования

---

## Валидация входных данных

Все входные данные проходят через **Zod-схемы**:

```typescript
// Примеры валидации:
email: z.string().email()           // Проверка формата email
password: z.string().min(6)         // Минимум 6 символов
grade: z.number().int().min(2).max(5)  // Оценка 2-5
role: z.enum(['admin', 'teacher', ...]) // Допустимые значения
name: z.string().transform(s => s.replace(/[<>]/g, ''))  // Удаление XSS-символов
```

---

## Защита от SQL-инъекций

Все запросы к БД используют **параметризованные запросы** через `pg`:

```typescript
// ПРАВИЛЬНО (безопасно):
await db.query(
  'SELECT * FROM users WHERE email = $1 AND id = $2',
  [email, userId]
);

// НЕПРАВИЛЬНО (небезопасно):
await db.query(`SELECT * FROM users WHERE email = '${email}'`);
```

---

## Защита от XSS

### На сервере

- **Helmet**: CSP-заголовки ограничивают источники скриптов
- **Zod**: Удаление `<` и `>` из имени пользователя

### На клиенте

```javascript
// utils.js
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

Используется при отображении пользовательского ввода (сообщения чата, комментарии).

---

## Безопасность файлов

### Загрузка изображений (чат)

```typescript
// multer настройки:
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 },  // 5 МБ максимум
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});
```

### Бэкапы

```typescript
// Защита от path traversal:
_safePath(name) {
  if (name.includes('..') || name.includes('/') || name.includes('\\')) {
    throw new Error('Invalid backup name');
  }
  return path.join(this.backupDir, name);
}
```

---

## Защита от brute-force

Rate limiting на критических эндпоинтах:

| Эндпоинт | Лимит | Причина |
|-----------|-------|---------|
| `POST /api/login` | 5 / 15 мин | Защита от подбора пароля |
| `POST /api/register` | 3 / 1 час | Защита от спама |
| `POST /api/password-reset/request` | 3 / 1 мин | Защита от перебора |

---

## Безопасность куки

```javascript
res.cookie('token', token, {
  httpOnly: true,        // Недоступна для JavaScript
  sameSite: 'strict',    // Защита от CSRF
  secure: true,          // Только HTTPS (в production)
  path: '/',             // доступна на всех путях
});
```

---

## Self-deletion Protection

Администратор не может удалить сам себя:

```typescript
// adminService.ts
async deleteUser(id, currentUserId) {
  if (id === currentUserId) {
    throw new AppError(400, 'Нельзя удалить свой аккаунт');
  }
  // ...
}
```

---

## Trust Proxy

Express настроен для работы за reverse proxy (Caddy):

```typescript
app.set('trust proxy', 1);
```

Это гарантирует корректное определение IP-адреса клиента для rate-limiting и логирования.

---

## Рекомендации для продакшена

- [ ] Использовать сильный `JWT_SECRET` (мин. 32 символа, не дефолтный)
- [ ] Изменить пароли PostgreSQL от дефолтных (`school`/`school_pass`)
- [ ] Настроить SMTP для email-уведомлений
- [ ] Включить HTTPS через Caddy или Cloudflare
- [ ] Регулярно обновлять зависимости (`npm audit`)
- [ ] Настроить firewall (порты 80/443 открыты, 3000 закрыт)
- [ ] Мониторить логи на подозрительную активность
