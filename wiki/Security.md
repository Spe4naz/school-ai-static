# Безопасность

---

## Обзор

```
┌─────────────────────────────────────────────────────┐
│                   УРОВНИ ЗАЩИТЫ                     │
├─────────────────────────────────────────────────────┤
│  1. Сеть:       Caddy (SSL, HSTS, безопасные заголовки)
│  2. Авторизация: JWT в httpOnly cookies             │
│  3. Данные:     bcrypt (8+ символов + сложность)   │
│  4. Валидация:  Zod-схемы + sanitizeEnvValue       │
│  5. Rate-limit: IP + per-user лимиты               │
│  6. SQL:        Параметризованные запросы           │
│  7. XSS:        escapeHtml + CSP nonces + Helmet    │
│  8. Cookie:     httpOnly + sameSite: strict         │
│  9. Docker:     execFile + whitelist валидация     │
│ 10. Кэш:        In-memory TTL                      │
│ 11. Логирование: Pino (structured JSON)            │
└─────────────────────────────────────────────────────┘
```

---

## Аутентификация

### JWT

- **Алгоритм**: HS256, зафиксирован в verify
- **Срок жизни**: 24 часа
- **Issuer**: `school-ai`
- **Хранение**: httpOnly cookie (недоступна для JavaScript)

### Refresh Tokens

- **Срок жизни**: 30 дней
- **Одноразовые** (consumed после использования)
- **Инвалидация**: при смене пароля все токены аннулируются
- **Хранение**: httpOnly cookie + БД

### Пароли

- **Хеширование**: bcrypt (12 раундов в production)
- **Минимум**: 8 символов + строчные + заглавные + цифры

---

## Command Injection Prevention

DockerService использует `execFile` вместо `exec` с шаблонными строками:

```javascript
// Безопасно (execFile с массивом аргументов):
this._exec('start', [name]);

// Небезопасно (было):
exec(`docker start ${name}`);
```

Все имена контейнеров валидируются regex `^[a-zA-Z0-9._-]+$`.

---

## Setup Wizard Security

- **Санитизация .env**: значения очищаются от `\n`, `"`, `'`, `` ` ``
- **Валидация домена**: regex `^[a-zA-Z0-9.-]+$`
- **Пароль БД**: генерируется автоматически (`crypto.randomBytes`)
- **JWT_SECRET**: генерируется автоматически
- **Creds файл**: `.setup-creds.json` удаляется после первого входа

---

## Rate Limiting

| Лимит | Количество | Окно | Область |
|-------|-----------|------|---------|
| Login | 5 | 15 мин | IP |
| Register | 3 | 1 час | IP |
| Password Reset | 3 | 15 мин | IP |
| Refresh | 10 | 15 мин | IP |
| API (глобальный) | 100 | 10 мин | IP |
| Write | 30 | 1 мин | IP |
| Upload | 10 | 10 мин | IP |
| Per-user | 60 | 1 мин | user ID |

---

## CSP (Content Security Policy)

Per-request nonces через `crypto.randomBytes(16)`:

```typescript
scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.cspNonce}'`]
```

HTML-файлы отдаются через маршруты с инъекцией nonce в `<script>` теги.

---

## Кэширование

| Данные | TTL | Инвалидация |
|--------|-----|-------------|
| Classes | 5 мин | При create/update/delete |
| Schedule | 2 мин | При create/update/delete |
| Announcements | 1 мин | При create/delete |

---

## Chat Keys

Ключи шифрования хранятся в `sessionStorage` (не `localStorage`) — при закрытии вкладки ключи удаляются.

---

## Graceful Shutdown

При SIGTERM/SIGINT:
1. SSE-клиентам отправляется `{"type":"shutdown"}`
2. Все SSE-соединения закрываются
3. HTTP-сервер завершает работу
4. Пул БД закрывается

---

## Рекомендации для продакшена

- [ ] Уникальный `JWT_SECRET` (мин. 32 символа)
- [ ] Уникальный пароль PostgreSQL
- [ ] SMTP настроен
- [ ] HTTPS через Caddy или Cloudflare
- [ ] Firewall: порты 80/443 открыты, 3000 закрыт
- [ ] `.env` не коммитится
- [ ] Тестовые пароли не используются
