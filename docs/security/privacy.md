# Security and Privacy Notes

## IP address handling

The Worker does not store raw IP addresses. It hashes the connecting IP with `IP_HASH_SECRET` and stores only the hash in D1.

Set a strong deployment-specific secret:

```sh
npx wrangler secret put IP_HASH_SECRET
```

Changing this secret changes future hashes and makes them impossible to correlate with older rows.

## Admin token

Admin routes require:

```text
Authorization: Bearer YOUR_ADMIN_TOKEN
```

The dashboard can also be opened with `?token=YOUR_ADMIN_TOKEN` for simple self-hosted use. Prefer Cloudflare Access or a private deployment for production dashboards.

Never commit real admin tokens to source control.

## CORS allowlist

Use `ALLOWED_ORIGINS` to control browser access:

```toml
ALLOWED_ORIGINS = "https://example.com,https://www.example.com"
```

`*` is convenient for local testing but should be narrowed for production.

## Honeypot spam control

Forms should include a hidden field matching `HONEYPOT_FIELD`, which defaults to `_gotcha`.

If the field is populated, the submission is stored as rejected and delivery is skipped. The public response remains generic so bots do not learn the detection rule.

## Rate limiting

Rate limiting uses hashed IPs and D1 counters. Defaults:

```toml
RATE_LIMIT_MAX = "5"
RATE_LIMIT_WINDOW_SECONDS = "600"
```

This protects against simple bursts but is not a replacement for advanced bot detection.

## Content checks

`MAX_LINKS` limits URL-heavy messages. Submissions above the limit are flagged and stored, but delivery is skipped unless you change the implementation.

## Data retention

Submissions remain in D1 until manually deleted. Rate-limit rows are cleaned by the scheduled trigger and can be manually cleaned with the admin cleanup endpoint.

## Recommended production hardening

- Use a restricted `ALLOWED_ORIGINS` list.
- Put the dashboard behind Cloudflare Access.
- Rotate `ADMIN_TOKEN` periodically.
- Review D1 data retention requirements with your client or organization.
- Add Turnstile if the form receives persistent spam.
