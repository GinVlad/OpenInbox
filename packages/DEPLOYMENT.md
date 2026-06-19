# OpenInbox — Deployment Guide

Single Cloudflare Worker (SMTP + API + Cron + Static Assets). No external services needed.

---

## Prerequisites

- Cloudflare account
- Domain(s) with DNS managed by Cloudflare
- Node.js `>= 20.x`

---

## Step 1 — Create D1 Database

```bash
wrangler d1 create openinbox
```

```bash
npx wrangler d1 create openinbox
```

Output example:
```
✅ Created database 'openinbox' with id abc123-def456-...
```

Copy the `database_id`. Paste into `packages/worker/wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "openinbox"
database_id = "abc123-def456-..."
```

---

## Step 2 — Apply Database Schema

```bash
npx wrangler d1 execute openinbox --file=../db/schema.sql
```

Verify:

```bash
npx wrangler d1 execute openinbox --command="SELECT name FROM sqlite_master WHERE type='table'"
```

Should return: `domains`, `inboxes`, `messages`, `attachments`.

---

## Step 3 — Install & Build Frontend - Goto frontend folder

```bash
npm --prefix packages/frontend install
npm --prefix packages/frontend run build
```

Output in `packages/frontend/dist/`.

---

## Step 4 — Configure Environment

Edit `packages/worker/wrangler.toml` and fill in all vars:

```toml
[vars]
EMAIL_DOMAIN = "your-domain.com,other-domain.com"
TURNSTILE_KEY = ""
TURNSTILE_SECRET = ""
COOKIES_SECRET = "<generate a random 64-char string>"
PASSWORD = "<your-admin-password>"
API_KEY = "<your-api-bearer-token>"
API_RATE_LIMIT_PER_MINUTE = "60"
SHOW_ADS = "false"
ENABLE_OPENAPI = "false"
```

### Generate strong secrets

```bash
openssl rand -hex 32  # COOKIES_SECRET
openssl rand -hex 32  # API_KEY
```

### Or set as Cloudflare Worker secrets (recommended for PASSWORD, API_KEY, COOKIES_SECRET)

```bash
wrangler secret put PASSWORD
wrangler secret put API_KEY
wrangler secret put COOKIES_SECRET
wrangler secret put TURNSTILE_SECRET
```

Secrets override `[vars]` in `wrangler.toml`.

---

## Step 5 — Install Worker Dependencies

```bash
npm --prefix packages/worker install
```

---

## Step 6 — Deploy Worker

```bash
cd packages/worker
npx wrangler deploy
```

Output:
```
✅ Deployed openinbox-worker
  https://openinbox-worker.<your-subdomain>.workers.dev
```

---

## Step 7 — Configure Cloudflare Email Routing

For **each domain** in `EMAIL_DOMAIN`:

1. Go to Cloudflare Dashboard → select domain
2. Click **Email** → **Email Routing**
3. Enable Email Routing if not already enabled
4. Go to **Routes** tab
5. Click **Create address**
6. Choose **Catch-all** (or specific addresses)
7. Action: **Send to a Worker**
8. Select **openinbox-worker**
9. Click **Save**

Result: all emails sent to `*@your-domain.com` are forwarded to your Worker.

---

## Step 8 — Add Domains & Inboxes

### Option 1: Via the Web UI
1. Open `https://openinbox-worker.<your-subdomain>.workers.dev`
2. Login with `PASSWORD`
3. Go to **Domains** → add your domain
4. Go to **Inboxes** → create inboxes

### Option 2: Via API
```bash
curl -X POST https://openinbox-worker.<your-subdomain>.workers.dev/api/domains \
  -H "Authorization: Bearer <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"name": "your-domain.com"}'

curl -X POST https://openinbox-worker.<your-subdomain>.workers.dev/api/inboxes \
  -H "Authorization: Bearer <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"name": "amazon", "domainId": "<domain-uuid>"}'
```

---

## Step 9 — Custom Domain (optional)

To run on your own domain instead of `workers.dev`:

1. Go to Cloudflare Dashboard → **Workers & Pages**
2. Select **openinbox-worker**
3. Go to **Triggers** → **Custom Domains**
4. Add your domain (e.g. `mail.your-domain.com`)
5. Cloudflare will provision SSL automatically

---

## Step 10 — Verify Everything

```bash
# 1. Check API
curl https://mail.your-domain.com/api/domains \
  -H "Authorization: Bearer <API_KEY>"

# 2. Send a test email
echo "Test email" | mail -s "Hello" amazon@your-domain.com

# 3. Check it arrived
curl https://mail.your-domain.com/api/messages?inboxId=<id> \
  -H "Authorization: Bearer <API_KEY>"

# 4. Open browser
open https://mail.your-domain.com
```

---

## Local Development

```bash
# Terminal 1: Frontend dev server
npm --prefix packages/frontend run dev

# Terminal 2: Worker dev server (with .dev.vars)
cat > packages/worker/.dev.vars << EOF
EMAIL_DOMAIN=example.com
PASSWORD=devpassword
COOKIES_SECRET=dev-secret-at-least-32-chars!!
API_KEY=dev-api-key-32-chars-minimum!!
ENABLE_OPENAPI=true
EOF

npx wrangler dev --port 8787
```

---

## Troubleshooting

| Problem | Check |
|---------|-------|
| Emails not arriving | Verify Email Routing is enabled and catch-all routes to Worker |
| API returns 401 | Verify `Authorization: Bearer <API_KEY>` header |
| Login fails | Ensure `COOKIES_SECRET` is ≥ 32 chars and `PASSWORD` is set |
| 404 on all routes | Ensure `[assets]` directory points to `../frontend/dist` |
| D1 error | Check `database_id` in `wrangler.toml` matches `wrangler d1 list` |
| Worker exceeds CPU | Emails over 1MB are silently dropped; review logs |

---

## Cost Estimate (Cloudflare Free Tier)

| Service | Free Tier | Usage |
|---------|-----------|-------|
| Workers | 100k req/day | Covers personal use |
| D1 | 5 GB storage, 5M reads/day | Covers thousands of emails |
| Email Workers | Unlimited | Free |
| R2 | Not used | N/A |

Total monthly cost: **$0** for personal use.

---

## Production Checklist

- [ ] `ENABLE_OPENAPI = "false"` (disabled for public)
- [ ] `COOKIES_SECRET` ≥ 32 random bytes
- [ ] `PASSWORD` strong and kept as secret
- [ ] `API_KEY` strong and kept as secret
- [ ] `EMAIL_DOMAIN` configured correctly (comma-separated)
- [ ] Cloudflare Email Routing enabled on all domains
- [ ] Custom domain set up with SSL
- [ ] `wrangler deploy` succeeds without errors
- [ ] End-to-end test: send email → view in UI
- [ ] All tests pass: `npx vitest run --coverage`
