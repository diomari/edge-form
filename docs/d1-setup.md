# D1 Setup

Create the database:

```sh
npx wrangler d1 create edge-form
```

Copy the returned `database_id` into `wrangler.toml`.

Apply migrations locally:

```sh
npm run db:migrate:local
```

Apply migrations remotely:

```sh
npm run db:migrate:remote
```

Required secrets:

```sh
npx wrangler secret put ADMIN_TOKEN
npx wrangler secret put IP_HASH_SECRET
```

Optional delivery secrets:

```sh
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put MAIL_FROM
npx wrangler secret put MAIL_TO
npx wrangler secret put WEBHOOK_URL
npx wrangler secret put WEBHOOK_SECRET
```

Operational variables live in `wrangler.toml`, including rate-limit window, cleanup retention, honeypot field, CORS allowlist, and message limits.

The scheduled cleanup trigger removes old rate-limit rows using `RATE_LIMIT_RETENTION_DAYS`.
