# Operations Guide

## Error handling

Public routes return stable JSON errors:

```json
{ "ok": false, "error": "validation_failed" }
```

Known public error codes:

- `invalid_request`
- `unsupported_content_type`
- `request_too_large`
- `validation_failed`
- `rate_limited`
- `method_not_allowed`
- `not_found`
- `server_error`

Internal exceptions are logged as structured JSON and returned as `server_error` without exposing stack traces, secrets, request bodies, or provider responses to form users.

## Observability

Worker logs include structured events:

- `submission_stored`
- `submission_rate_limited`
- `delivery_adapter_result`
- `rate_limits_cleanup`

Inspect logs with Wrangler:

```sh
npx wrangler tail
```

The admin summary endpoint provides basic counts:

```sh
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://YOUR_WORKER_URL/api/admin/summary
```

It returns totals for accepted, rejected, flagged, sent, failed, and rate-limit rows.

## Rate-limit cleanup

Old rate-limit rows are removed by the scheduled Worker trigger in `wrangler.toml`:

```toml
[triggers]
crons = ["17 3 * * *"]
```

Retention is controlled by:

```toml
RATE_LIMIT_RETENTION_DAYS = "7"
```

Manual cleanup through the admin API:

```sh
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://YOUR_WORKER_URL/api/admin/cleanup
```

Manual cleanup with SQL:

```sh
npx wrangler d1 execute edge-form --remote --command \
  "DELETE FROM rate_limits WHERE updated_at < datetime('now', '-7 days')"
```

## Delivery troubleshooting

1. Check `delivery_status` in the dashboard.
2. Open a submission detail and inspect delivery events.
3. Use `npx wrangler tail` to find `delivery_adapter_result` logs.
4. Verify adapter secrets are configured.
5. Confirm webhook endpoints return a 2xx response.

## Safe logging rules

Logs should contain operational metadata only:

- submission id
- spam status
- delivery status
- adapter name
- error class/status

Do not log raw message bodies, admin tokens, API keys, cookies, authorization headers, or raw IP addresses.
