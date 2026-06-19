# edge-form Technical Plan

## 1. Product Summary

**edge-form** is a self-hostable Cloudflare Workers backend for static-site contact forms. It accepts form submissions, applies spam protection, stores submissions in Cloudflare D1, optionally forwards messages through Resend or a webhook, and provides export-friendly dashboard/admin capabilities.

## 2. Goals

- Provide a simple hosted endpoint for portfolio, client, and small-business contact forms.
- Run entirely on Cloudflare infrastructure using Workers, D1, and optional KV/R2 if needed.
- Require minimal setup and low operational cost.
- Protect forms from basic spam and abuse.
- Preserve a searchable/exportable submission log.
- Support email delivery through Resend and generic webhooks.

## 3. Non-Goals

- Full marketing automation platform.
- Multi-user CRM replacement.
- Complex workflow automation.
- Guaranteed inbox delivery without third-party email configuration.
- Advanced bot detection beyond practical edge protections.

## 4. Target Users

- Developers hosting static websites.
- Freelancers building client landing pages.
- Small businesses needing a simple contact form backend.
- Portfolio owners who want form storage plus email alerts.

## 5. Core Architecture

```text
Browser Form
   |
   v
Cloudflare Worker
   |-- Validate payload
   |-- Honeypot check
   |-- Rate-limit check
   |-- Store in D1
   |-- Send email/webhook
   v
JSON response

Admin/Dashboard
   |
   v
Worker-protected admin routes
   |-- View submissions
   |-- Filter/search
   |-- Export CSV
```

## 6. Cloudflare Components

### Workers

Primary runtime for:

- Public form submission endpoint.
- Admin/dashboard API.
- CSV export endpoint.
- Adapter dispatch for email/webhook delivery.

### D1

Stores submission records, delivery status, and configuration metadata.

### KV, Optional

Useful for lightweight rate-limiting counters, admin session tokens, or cached project configuration.

### Turnstile, Optional/Future

Can be added as an optional stronger anti-spam layer.

## 7. API Design

### Public Submit Endpoint

`POST /api/submit`

Expected payload:

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "subject": "Project inquiry",
  "message": "Hello...",
  "_gotcha": ""
}
```

Response examples:

```json
{ "ok": true, "id": "sub_123" }
```

```json
{ "ok": false, "error": "rate_limited" }
```

### Admin List Endpoint

`GET /api/admin/submissions`

Query parameters:

- `limit`
- `cursor`
- `status`
- `from`
- `to`
- `q`

### CSV Export Endpoint

`GET /api/admin/export.csv`

Returns CSV with common fields:

- id
- created_at
- name
- email
- subject
- message
- ip_hash
- user_agent
- spam_score
- delivery_status

## 8. Data Model

### submissions

| Field | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID or generated id |
| created_at | TEXT | ISO timestamp |
| name | TEXT | Optional depending on form |
| email | TEXT | Validated email |
| subject | TEXT | Optional |
| message | TEXT | Required |
| metadata_json | TEXT | Extra fields as JSON |
| ip_hash | TEXT | Hashed client IP |
| user_agent | TEXT | User agent snapshot |
| spam_status | TEXT | accepted/rejected/flagged |
| delivery_status | TEXT | pending/sent/failed/skipped |
| delivery_error | TEXT | Last adapter error |

### rate_limits

| Field | Type | Notes |
|---|---|---|
| key | TEXT PK | IP hash or composite key |
| window_start | TEXT | Window timestamp |
| count | INTEGER | Request count |

### delivery_events

| Field | Type | Notes |
|---|---|---|
| id | TEXT PK | Event id |
| submission_id | TEXT | Related submission |
| adapter | TEXT | resend/webhook |
| status | TEXT | sent/failed |
| response_json | TEXT | Adapter response |
| created_at | TEXT | ISO timestamp |

## 9. Spam Protection

### Honeypot

- Add hidden field such as `_gotcha`.
- Reject or silently accept without delivery when populated.
- Do not reveal spam detection reason to the client.

### Rate Limiting

Initial policy:

- Per IP hash.
- Example: 5 submissions per 10 minutes.
- Return `429` or generic success based on configured mode.

### Validation

- Enforce method and content type.
- Limit request body size.
- Validate email format.
- Require message length within configured bounds.
- Reject suspicious repeated URLs or excessive links.

## 10. Delivery Adapters

### Resend Adapter

Configuration:

- `RESEND_API_KEY`
- `MAIL_FROM`
- `MAIL_TO`
- Optional `REPLY_TO_FIELD=email`

Behavior:

- Convert submission into readable email.
- Store send result in `delivery_events`.
- Mark submission delivery status.

### Webhook Adapter

Configuration:

- `WEBHOOK_URL`
- Optional `WEBHOOK_SECRET`

Behavior:

- POST normalized submission JSON.
- Sign payload with HMAC if secret is configured.
- Retry strategy can be added later.

## 11. Admin/Dashboard Plan

Minimum dashboard features:

- Login/auth guard.
- Submission list.
- Submission detail view.
- Status badges for spam and delivery.
- CSV export button.
- Basic filters by date and delivery status.

Authentication options:

- Initial: static admin token via environment variable.
- Later: Cloudflare Access integration.

## 12. Configuration

Environment variables:

```text
ADMIN_TOKEN=
RESEND_API_KEY=
MAIL_FROM=
MAIL_TO=
WEBHOOK_URL=
WEBHOOK_SECRET=
RATE_LIMIT_MAX=5
RATE_LIMIT_WINDOW_SECONDS=600
HONEYPOT_FIELD=_gotcha
```

`wrangler.toml` bindings:

```toml
[[d1_databases]]
binding = "DB"
database_name = "edge-form"
database_id = "..."
```

## 13. Security Considerations

- Never store raw IP addresses; store salted hashes.
- Validate and sanitize all submitted fields.
- Escape dashboard-rendered values.
- Use admin token or Cloudflare Access for admin routes.
- Avoid leaking spam/rate-limit logic in public responses.
- Keep adapter secrets in Worker environment variables.
- Add CORS allowlist configuration for production deployments.

## 14. Error Handling

Public errors should be stable and minimal:

- `invalid_request`
- `validation_failed`
- `rate_limited`
- `server_error`

Internal errors should be logged with enough detail for debugging while avoiding sensitive payload leakage.

## 15. Observability

Track:

- Total accepted submissions.
- Rejected spam count.
- Rate-limited count.
- Delivery success/failure count.
- Adapter latency.

Potential tools:

- Worker logs.
- D1 delivery events.
- Optional analytics endpoint.

## 16. Implementation Milestones

### Milestone 1: Worker Foundation

- Create Worker project.
- Add routing.
- Add D1 binding.
- Add health endpoint.

### Milestone 2: Submission Endpoint

- Parse JSON/form data.
- Validate fields.
- Apply honeypot.
- Store accepted submissions in D1.

### Milestone 3: Rate Limiting

- Add per-IP hash limit.
- Store counters in D1 or KV.
- Add tests for limit behavior.

### Milestone 4: Delivery Adapters

- Implement Resend adapter.
- Implement generic webhook adapter.
- Store delivery events and statuses.

### Milestone 5: Admin API and CSV

- Add admin auth guard.
- Add list/detail endpoints.
- Add CSV export.

### Milestone 6: Dashboard

- Build minimal dashboard UI.
- Add filters and detail view.
- Add export action.

### Milestone 7: Hardening and Docs

- Add CORS allowlist.
- Add deployment guide.
- Add example HTML forms.
- Add troubleshooting docs.

## 17. Testing Plan

- Unit tests for validation and spam checks.
- Integration tests for D1 insert/list/export.
- Adapter tests with mocked Resend/webhook responses.
- Rate-limit tests across time windows.
- Manual deployment smoke test using `wrangler dev` and preview deploy.

## 18. Documentation Deliverables

- README with quick start.
- Cloudflare setup guide.
- D1 migration guide.
- Environment variable reference.
- HTML form integration examples.
- Resend setup guide.
- Webhook signing guide.
- Admin/dashboard guide.
- Security and privacy notes.

## 19. Open Questions

- Should spam submissions be stored as flagged records or discarded?
- Should successful spam honeypot responses return `200` to avoid bot feedback?
- Should rate limiting use D1 only or require KV for better performance?
- Should dashboard be bundled inside the Worker or served separately?
- Should the project support multiple forms/sites in one deployment?
