# edge-form

Self-hostable Cloudflare contact form backend with spam protection, D1 submission storage, Resend/webhook delivery, an admin dashboard, and CSV export.

## Features

- `POST /api/submit` contact form endpoint
- JSON, URL-encoded, and multipart form parsing
- Honeypot spam protection
- D1-backed rate limiting
- D1 submission log
- Resend email adapter
- Generic webhook adapter with optional HMAC signature
- Protected admin API and dashboard at `/admin`
- CSV export
- Scheduled cleanup for old rate-limit rows

## Requirements

- Node.js 20+
- Cloudflare account
- Wrangler CLI
- Cloudflare D1 database

## Install

```sh
npm install
```

## Create D1 database

```sh
npx wrangler d1 create edge-form
```

Copy the returned `database_id` into `wrangler.toml`.

## Configure secrets

Required:

```sh
npx wrangler secret put ADMIN_TOKEN
npx wrangler secret put IP_HASH_SECRET
```

Optional email delivery:

```sh
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put MAIL_FROM
npx wrangler secret put MAIL_TO
```

Optional webhook delivery:

```sh
npx wrangler secret put WEBHOOK_URL
npx wrangler secret put WEBHOOK_SECRET
```

## Apply migrations

Local:

```sh
npm run db:migrate:local
```

Remote:

```sh
npm run db:migrate:remote
```

## Run locally

```sh
npm run dev
```

Health check:

```sh
curl http://localhost:8787/health
```

Submit a test form:

```sh
curl -X POST http://localhost:8787/api/submit \
  -H 'content-type: application/json' \
  -d '{"name":"Jane","email":"jane@example.com","message":"Hello"}'
```

## Deploy

```sh
npm run deploy
```

## Admin dashboard

Open:

```text
https://YOUR_WORKER_URL/admin?token=YOUR_ADMIN_TOKEN
```

The dashboard supports submission listing, detail view, filters, CSV export, summary counts, and manual rate-limit cleanup.

## Admin API

Use a bearer token:

```sh
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://YOUR_WORKER_URL/api/admin/submissions
```

Endpoints:

- `GET /api/admin/summary`
- `GET /api/admin/submissions`
- `GET /api/admin/submissions/:id`
- `GET /api/admin/export.csv`
- `POST /api/admin/cleanup`

## Configuration

`wrangler.toml` contains safe defaults:

- `RATE_LIMIT_MAX`
- `RATE_LIMIT_WINDOW_SECONDS`
- `RATE_LIMIT_RETENTION_DAYS`
- `HONEYPOT_FIELD`
- `MESSAGE_MIN_LENGTH`
- `MESSAGE_MAX_LENGTH`
- `MAX_LINKS`
- `MAX_BODY_BYTES`
- `ALLOWED_ORIGINS`

## Docs and examples

- `docs/d1-setup.md`
- `docs/operations.md`
- `docs/adapters/resend.md`
- `docs/adapters/webhook.md`
- `docs/security/privacy.md`
- `examples/basic-form.html`
- `examples/fetch-form.html`

## Test

```sh
npm run typecheck
npm test
```
