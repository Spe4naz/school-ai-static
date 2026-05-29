# Безопасность

Обзор мер безопасности проекта School AI.

---

## Обзор

```
┌─────────────────────────────────────────────────────┐
│                   УРОВНИ ЗАЩИТЫ                     │
├─────────────────────────────────────────────────────┤
│  1. Сеть:       Caddy (SSL, HSTS, безопасные заголовки)
│  2. Авторизация: JWT в httpOnly cookies             │
│  3. Данные:     bcrypt (8+ символов + сложность)   │
│  4. Валидация:  Zod-схемы для всех входных данных  │
│  5. Rate-limit: IP + per-user лимиты               │
│  6. SQL:        Параметризованные запросы           │
│  7. XSS:        escapeHtml + CSP nonces + Helmet    │
│  8. Cookie:     httpOnly + sameSite: strict         │
│  9. Кэш:        In-memory TTL                      │
│ 10. Логирование: Pino (structured JSON)            │
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

```javascript
scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.cspNonce}'`]
```

HTML-файлы отдаются через маршруты с инъекцией nonce в `<script>` теги.

---

## Кэширование

In-memory TTL-кэш (`utils/cache.ts`):

| Данные | TTL | Инвалидация |
|--------|-----|-------------|
| Classes | 5 мин | При create/update/delete |
| Schedule | 2 мин | При create/update/delete |
| Announcements | 1 мин | При create/delete |

---

## Логирование (Pino)

```javascript
logger.info({ method, path, status, duration, ip, userId })
```

Production: `warn` | Development: `info` | Test: `silent`

---

## Graceful Shutdown

При SIGTERM/SIGINT:
1. SSE-клиентам отправляется shutdown event
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
