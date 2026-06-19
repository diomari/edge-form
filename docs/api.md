# API Reference

## Public endpoints

### `GET /health`

Returns a simple service status response.

Example:

```json
{ "ok": true, "service": "edge-form" }
```

### `POST /api/submit`

Accepts form submissions.

Supported content types:

- `application/json`
- `application/x-www-form-urlencoded`
- `multipart/form-data`

Example JSON payload:

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "subject": "Project inquiry",
  "message": "Hello...",
  "_gotcha": ""
}
```

Success response:

```json
{ "ok": true, "id": "sub_123" }
```

Notes:

- Honeypot field defaults to `_gotcha`
- Rate limiting is applied per hashed IP
- Accepted submissions are stored in D1
- Delivery adapter failures do not fail the public response

## Admin endpoints

Admin endpoints require:

```http
Authorization: Bearer YOUR_ADMIN_TOKEN
```

### `GET /api/admin/summary`

Returns summary counts for submissions, delivery state, and rate-limit rows.

### `GET /api/admin/submissions`

Returns a filtered list of submissions.

Query params:

- `limit`
- `cursor`
- `status`
- `from`
- `to`
- `q`

### `GET /api/admin/submissions/:id`

Returns a single submission and its related delivery events.

### `GET /api/admin/export.csv`

Exports filtered submissions as CSV.

### `POST /api/admin/cleanup`

Deletes old rate-limit rows based on `RATE_LIMIT_RETENTION_DAYS`.

## Error codes

Public JSON errors use this shape:

```json
{ "ok": false, "error": "validation_failed" }
```

Common codes:

- `invalid_request`
- `unsupported_content_type`
- `request_too_large`
- `validation_failed`
- `rate_limited`
- `method_not_allowed`
- `not_found`
- `unauthorized`
- `server_error`

## Configuration values

Main runtime settings in `wrangler.toml`:

- `RATE_LIMIT_MAX`
- `RATE_LIMIT_WINDOW_SECONDS`
- `RATE_LIMIT_RETENTION_DAYS`
- `HONEYPOT_FIELD`
- `MESSAGE_MIN_LENGTH`
- `MESSAGE_MAX_LENGTH`
- `MAX_LINKS`
- `MAX_BODY_BYTES`
- `ALLOWED_ORIGINS`
