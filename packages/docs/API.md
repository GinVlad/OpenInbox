# OpenInbox API Reference

Single-user internal API. Served by Cloudflare Worker.

## Authentication

Two methods — use whichever fits your client:

**Bearer Token** (scripts / automation):
```http
Authorization: Bearer <API_KEY>
```

**Signed Cookie** (web UI):
```
POST /api/auth/login  { "password": "..." }
→ sets session=<payload>.<hmac> cookie
```

## Rate Limiting

| Header | Value |
|---|---|
| `CF-Connecting-IP` | Used as rate-limit key |
| Limit | `API_RATE_LIMIT_PER_MINUTE` (default 60) |
| Exceeded | `429 Too Many Requests` with `retryAfter` seconds |

---

## Endpoints

### Domains

#### List all domains
```
GET /api/domains
```
Response: `{ "data": [Domain, ...] }`

#### Create domain
```
POST /api/domains
Content-Type: application/json

{ "name": "example.com" }
```
Response: `201` with Domain object  
Error: `409` if already exists

#### Toggle domain enabled/disabled
```
PATCH /api/domains/:id
{ "enabled": 0 }
```
Response: updated Domain object  
Error: `404` if not found

#### Delete domain (cascades all inboxes + messages)
```
DELETE /api/domains/:id
```
Response: `{ "success": true }`

---

### Inboxes

#### List inboxes
```
GET /api/inboxes?domainId=xxx
```
Response: `{ "data": [Inbox, ...] }`

#### Create inbox
```
POST /api/inboxes
{ "name": "amazon", "domainId": "uuid" }
```
- `name`: 3–64 chars, lowercase only (`[a-z0-9._-]+`)
- `domainId`: must reference an enabled domain

Response: `201` with Inbox object  
Errors: `400` (invalid name/disabled domain), `404` (domain not found), `409` (inbox already exists)

#### Delete inbox (cascades all messages)
```
DELETE /api/inboxes/:id
```
Response: `{ "success": true }`

---

### Messages

#### List messages (paginated)
```
GET /api/messages?inboxId=xxx&cursor=xxx&limit=50
```
- `limit`: 1–100, default 50
- `cursor`: `created_at` value from last item (for next page)
- `inboxId`: optional filter

Response: `{ "data": [Message, ...], "nextCursor": "2025-01-01T00:00:00Z" }`

When `nextCursor` is `null`, no more pages.

#### Get single message
```
GET /api/messages/:id
```
Response: `{ "data": Message }`

#### Mark read/unread
```
PATCH /api/messages/:id
{ "isRead": 1 }
```
`isRead`: `0` = unread, `1` = read

#### Delete message
```
DELETE /api/messages/:id
```
Response: `{ "success": true }`

---

### Search

```
GET /api/search?q=amazon&inboxId=xxx
```
- `q`: search term (required), matched against `sender`, `subject`, `recipient` using SQL `LIKE '%term%'`
- `inboxId`: optional filter

Response: `{ "data": [Message, ...] }` — max 100 results

---

### Auth

#### Login
```
POST /api/auth/login
{ "password": "your-password" }
```
- Validates against `PASSWORD` env var.
- Sets `session` cookie (HttpOnly, 24h, SameSite=Lax).
- Response: `{ "success": true }` or `401`

---

## Schemas

### Domain
```json
{
  "id": "uuid",
  "name": "example.com",
  "enabled": 1,
  "created_at": "2025-01-01T00:00:00"
}
```

### Inbox
```json
{
  "id": "uuid",
  "name": "amazon",
  "domain_id": "uuid",
  "full_email": "amazon@example.com",
  "created_at": "2025-01-01T00:00:00"
}
```

### Message
```json
{
  "id": "uuid",
  "inbox_id": "uuid",
  "sender": "noreply@amazon.com",
  "recipient": "amazon@example.com",
  "subject": "Your order",
  "text_body": "plain text content",
  "html_body": "<p>html content</p>",
  "headers": "{\"From\":\"...\"}",
  "is_read": 0,
  "created_at": "2025-01-01T00:00:00"
}
```

### Error
```json
{
  "error": "Human-readable message",
  "details": { "field": "validation error" },
  "retryAfter": 30
}
```

---

## Status Codes

| Code | Meaning |
|---|---|
| 200 | OK |
| 201 | Created |
| 400 | Invalid request / validation error |
| 401 | Missing or invalid credentials |
| 404 | Resource not found |
| 409 | Conflict (duplicate domain/inbox) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
