# OpenInbox

Personal disposable email system. Self-hosted, Cloudflare-native.

## How it works

Email → Cloudflare Worker (SMTP + API + Cron) → D1 Database → Web UI

## Packages

- `packages/worker/` — Unified Cloudflare Worker (email receiver, REST API, cron cleanup, static assets)
- `packages/frontend/` — Vite React SPA dashboard
- `packages/db/` — D1 SQLite schema + migrations

## Tech Stack

- Cloudflare Workers
- Cloudflare Email Workers (SMTP)
- Cloudflare D1 (SQLite)
- Hono (API framework)
- React + Vite + Tailwind CSS (frontend)

## Quick Deploy

See [DEPLOYMENT.md](DEPLOYMENT.md).

## License

MIT
