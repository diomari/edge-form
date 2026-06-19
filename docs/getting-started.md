# Getting Started

## Requirements

- Node.js 20+
- Cloudflare account
- Wrangler CLI
- Cloudflare D1 database

## Install dependencies

```sh
npm install
```

## Create the D1 database

```sh
npx wrangler d1 create edge-form
```

Copy the returned `database_id` into `wrangler.toml`.

## Configure required secrets

```sh
npx wrangler secret put ADMIN_TOKEN
npx wrangler secret put IP_HASH_SECRET
```

## Optional delivery secrets

### Resend

```sh
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put MAIL_FROM
npx wrangler secret put MAIL_TO
```

### Webhook

```sh
npx wrangler secret put WEBHOOK_URL
npx wrangler secret put WEBHOOK_SECRET
```

## Apply migrations

```sh
npm run db:migrate:local
npm run db:migrate:remote
```

## Run locally

```sh
npm run dev
```

## Smoke test

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

## Open the admin dashboard

```text
https://YOUR_WORKER_URL/admin?token=YOUR_ADMIN_TOKEN
```

## Next steps

- [D1 Setup](/d1-setup)
- [API Reference](/api)
- [Examples](/examples)
- [Operations](/operations)
