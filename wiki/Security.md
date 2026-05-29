# Безопасность

Обзор мер безопасности, реализованных в проекте School AI.

---

## Обзор

```
┌─────────────────────────────────────────────────────┐
│                   УРОВНИ ЗАЩИТЫ                     │
├─────────────────────────────────────────────────────┤
│  1. Сеть:       Caddy (SSL, HSTS, безопасные заголовки)
│  2. Авторизация: JWT + Refresh Tokens (httpOnly cookies)
│  3. Данные:     bcrypt паролей, AES-256-GCM чата   │
│  4. Валидация:  Zod-схемы для всех входных данных  │
│  5. Rate-limit: IP + per-user лимиты               │
│  6. SQL:        Параметризованные запросы           │
│  7. XSS:        escapeHtml + CSP nonces + Helmet    │
│  8. Файлы:      Проверка типов, размера, rate-limit │
│  9. Cookie:     httpOnly + sameSite: strict         │
└─────────────────────────────────────────────────────┘
```

---

## Аутентификация

### JWT (JSON Web Tokens)

- **Алгоритм**: HS256 (HMAC-SHA256), зафиксирован в verify
- **Срок жизни access token**: 24 часа
- **Issuer claim**: `school-ai` (проверяется при верификации)
- **Хранение**: httpOnly cookie (недоступна для JavaScript)

### Refresh Tokens

- **Срок жизни**: 30 дней
- **Использование**: одноразовый (consumed после каждого использования)
- **Хранение**: в БД (таблица `refresh_tokens`)
- **Генерация**: 48 криптографически стойких случайных байт
- **Инвалидация**: при смене пароля все refresh-токены пользователя аннулируются
- **Хранение**: httpOnly cookie

### Пароли

- **Хеширование**: bcrypt
- **Раунды**: 12 (production) / 8 (development)
- **Минимальная длина**: 8 символов
- **Требования к сложности**: строчные + заглавные буквы + цифры
- **Отказ от дефолтных секретов**: сервер проверяет и отклоняет известные JWT-секреты + требует мин. 32 символа

---

## Rate Limiting

| Лимит | Количество | Окно | Область |
|-------|-----------|------|---------|
| Вход | 5 запросов | 15 мин | IP |
| Регистрация | 3 запроса | 1 час | IP |
| Сброс пароля | 3 запроса | 15 мин | IP |
| Обновление токена | 10 запросов | 15 мин | IP |
| API (глобальный) | 100 запросов | 10 мин | IP |
| Запись (POST/PUT/DELETE) | 30 запросов | 1 мин | IP |
| Загрузка файлов | 10 запросов | 10 мин | IP |
| Per-user (аутентифицированные) | 60 запросов | 1 мин | user ID |

Все лимиты отключаются в `test`/`ci` режимах.

---

## Защита HTTP-заголовков (Helmet)

```javascript
helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", nonce],     // Per-request nonce вместо unsafe-inline
      styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],  // BoxIcons
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  frameguard: { action: 'deny' },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
})
```

### CSP Nonces

Для каждого HTTP-запроса генерируется уникальный nonce через `crypto.randomBytes(16)`:

```typescript
// server.ts
app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
});
```

HTML-файлы подаются через маршруты с инъекцией nonce в теги `<script>`.

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
password: z.string().min(8)         // Минимум 8 символов + сложность
grade: z.number().int().min(2).max(5)  // Оценка 2-5
role: z.enum(['admin', 'teacher', ...]) // Допустимые значения
name: z.string().transform(s => s.replace(/[<>]/g, '').replace(/&/g, '&amp;')...)  // XSS-санитизация
```

### Требования к паролю

```typescript
password: z.string()
  .min(8, 'Минимум 8 символов')
  .max(128)
  .regex(/[a-z]/, 'Хотя бы одна строчная буква')
  .regex(/[A-Z]/, 'Хотя бы одна заглавная буква')
  .regex(/[0-9]/, 'Хотя бы одна цифра')
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

- **Helmet**: CSP-заголовки с per-request nonces ограничивают источники скриптов
- **Zod**: Санитизация имени пользователя (удаление `<>`, экранирование `&"'`)

### На клиенте

```javascript
// utils.js
export function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
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

- **Rate-limit**: 10 загрузок / 10 минут на IP
- **Имена файлов**: `crypto.randomBytes(8)` вместо `Math.random()`
- **Двойная проверка**: MIME-тип + расширение файла

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

## Безопасность куки

### Access Token

```javascript
res.cookie('token', accessToken, {
  httpOnly: true,        // Недоступна для JavaScript
  sameSite: 'strict',    // Защита от CSRF
  secure: true,          // Только HTTPS (в production)
  maxAge: 24 * 60 * 60 * 1000,  // 24 часа
});
```

### Refresh Token

```javascript
res.cookie('refreshToken', refreshToken, {
  httpOnly: true,        // Недоступна для JavaScript
  sameSite: 'strict',    // Защита от CSRF
  secure: true,          // Только HTTPS (в production)
  maxAge: 30 * 24 * 60 * 60 * 1000,  // 30 дней
});
```

### Ключевые особенности

- **Только httpOnly cookies** — токен НЕ передаётся в JSON-ответе
- **Фронтенд** использует `credentials: 'same-origin'` для автоматической отправки cookies
- **Logout** очищает обе cookies и аннулирует refresh-токен

---

## Защита от brute-force

Rate limiting на критических эндпоинтах:

| Эндпоинт | Лимит | Причина |
|-----------|-------|---------|
| `POST /api/login` | 5 / 15 мин | Защита от подбора пароля |
| `POST /api/register` | 3 / 1 час | Защита от спама |
| `POST /api/password-reset/request` | 3 / 15 мин | Защита от перебора |
| `POST /api/refresh` | 10 / 15 мин | Защита от перебора refresh-токенов |
| `POST /api/chat/upload` | 10 / 10 мин | Защита от заполнения диска |

---

## Серверная авторизация Admin Panel

Админ-панель защищена на серверном уровне — проверяется JWT и роль `admin`:

```typescript
app.get('/admin-panel', (req, res) => {
  const token = req.cookies?.token;
  if (!token) return res.redirect('/');
  try {
    const decoded = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'], issuer: 'school-ai' });
    if (decoded.role !== 'admin') return res.redirect('/');
  } catch { return res.redirect('/'); }
  // ... отдаём HTML
});
```

---

## SSE-защита

### Ограничение CORS

```typescript
const allowedOrigin = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
res.writeHead(200, {
  'Access-Control-Allow-Origin': allowedOrigin,  // Не '*', а конкретный origin
});
```

### Ограничение соединений

Максимум 3 SSE-соединения на пользователя. При превышении самое старое закрывается.

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

## Минимальная длина пароля

Сервер проверяет `JWT_SECRET` при старте:

```typescript
// Требования:
if (process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET must be at least 32 characters long.');
  process.exit(1);
}
```

`DATABASE_URL` является обязательной переменной — приложение не стартует без неё.

---

## Кэширование

In-memory TTL-кэш снижает нагрузку на БД для часто запрашиваемых данных:

```typescript
// utils/cache.ts
setCache('classes:all', result, 5 * 60 * 1000);  // 5 мин
setCache('schedule:...', result, 2 * 60 * 1000);  // 2 мин
setCache('announcements:...', result, 60 * 1000);  // 1 мин
```

- Кэш автоматически очищается при истечении TTL
- Инвалидация при записи: `invalidate('classes:all')`, `invalidatePrefix('schedule:')`
- Кэш не содержит чувствительных данных (пароли, токены)

---

## Логирование

Структурированное логирование через **Pino**:

```typescript
// middleware/logger.ts
logger.info({ method, path, status, duration, ip, userId });
// Вывод: {"level":"info","time":"...","method":"GET","path":"/api/grades","status":200,"duration":15,"ip":"127.0.0.1","userId":"uuid"}
```

- В production: level `warn` (только ошибки)
- В development: level `info` (все запросы)
- В test/ci: level `silent` (без логов)
- Формат: JSON для машинного парсинга

---

## Graceful Shutdown

При получении SIGTERM/SIGINT:

1. SSE-клиентам отправляется `{"type":"shutdown"}`
2. Все SSE-соединения закрываются
3. HTTP-сервер завершает обработку запросов
4. Пул соединений с БД закрывается

```typescript
// server.ts
for (const [, clients] of sseClients) {
  clients.forEach(c => { c.write('data: {"type":"shutdown"}\n\n'); c.end(); });
}
await httpServer.close();
await db.close();
```

---

## Рекомендации для продакшена

- [ ] Использовать сильный `JWT_SECRET` (мин. 32 символа, не дефолтный)
- [ ] Изменить пароли PostgreSQL от дефолтных (`school`/`school_pass`)
- [ ] Настроить SMTP для email-уведомлений
- [ ] Включить HTTPS через Caddy или Cloudflare
- [ ] Регулярно обновлять зависимости (`npm audit`)
- [ ] Настроить firewall (порты 80/443 открыты, 3000 закрыт)
- [ ] Мониторить логи на подозрительную активность
- [ ] Не коммитить `.env` файлы (все `.env.*` в `.gitignore`)
