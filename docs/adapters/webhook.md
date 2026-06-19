# Webhook Adapter

The webhook adapter POSTs accepted submissions to any HTTPS endpoint.

## Required secret

```sh
npx wrangler secret put WEBHOOK_URL
```

## Optional signing secret

```sh
npx wrangler secret put WEBHOOK_SECRET
```

When `WEBHOOK_SECRET` is configured, the Worker sends this header:

```text
x-edge-form-signature: HEX_HMAC_SHA256
```

The signature is computed over the exact JSON request body with HMAC-SHA256.

## Payload

```json
{
  "id": "submission-id",
  "created_at": "2026-06-18T00:00:00.000Z",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "subject": "Project inquiry",
  "message": "Hello...",
  "metadata": {
    "company": "Acme"
  }
}
```

## Receiver requirements

Your webhook endpoint should:

- accept `POST`
- parse `application/json`
- return a 2xx status for success
- verify the HMAC signature if `WEBHOOK_SECRET` is set

## Missing config

If `WEBHOOK_URL` is not configured, the webhook adapter is marked as `skipped`. The submission is still stored.

## Failure handling

A non-2xx response or network error is recorded in `delivery_events` and reflected in the submission delivery status. The public form response still succeeds after storage.
