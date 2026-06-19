# edge-form Implementation Tasks

## Phase 1: Project Foundation

### Task 1.1: Initialize Cloudflare Worker project

- Create the Worker app structure.
- Add TypeScript configuration.
- Add Wrangler configuration.
- Add basic package scripts for development, testing, deployment, and migrations.
- Define initial environment variable placeholders.

**Acceptance criteria**

- `wrangler dev` starts successfully.
- TypeScript compiles without errors.
- A health route returns a successful JSON response.

### Task 1.2: Configure Cloudflare D1 binding

- Add D1 binding to `wrangler.toml`.
- Create local and production database configuration placeholders.
- Add migration command scripts.
- Document required D1 setup commands.

**Acceptance criteria**

- Worker can access `env.DB` locally.
- Migration command can be run through npm scripts.

### Task 1.3: Add routing foundation

- Implement a small route dispatcher.
- Add route groups for public API and admin API.
- Add consistent JSON response helpers.
- Add method-not-allowed and not-found handling.

**Acceptance criteria**

- Unknown routes return `404` JSON.
- Unsupported methods return `405` JSON.
- Route handlers receive request, env, and context objects consistently.

## Phase 2: Database Schema

### Task 2.1: Create submissions migration

- Add `submissions` table.
- Include fields for submitter data, metadata JSON, IP hash, user agent, spam status, delivery status, and delivery error.
- Add indexes for `created_at`, `spam_status`, and `delivery_status`.

**Acceptance criteria**

- Migration creates the table successfully.
- Insert and select queries work locally.

### Task 2.2: Create rate limit migration

- Add `rate_limits` table.
- Store key, window start, count, and updated timestamp.
- Add indexes suitable for cleanup and lookup.

**Acceptance criteria**

- Rate-limit counters can be inserted, updated, and queried.

### Task 2.3: Create delivery events migration

- Add `delivery_events` table.
- Store submission id, adapter name, status, response JSON, and timestamp.
- Add index on `submission_id`.

**Acceptance criteria**

- Delivery event rows can be stored and listed by submission.

## Phase 3: Public Submission Endpoint

### Task 3.1: Implement request parsing

- Support JSON form submissions.
- Support `application/x-www-form-urlencoded` submissions.
- Reject unsupported content types.
- Enforce maximum request body size.

**Acceptance criteria**

- JSON and URL-encoded forms are parsed into the same normalized shape.
- Oversized or unsupported requests return stable error responses.

### Task 3.2: Implement field validation

- Validate email format.
- Require message content.
- Apply configurable min/max message length.
- Normalize optional name and subject fields.
- Move unknown fields into metadata JSON.

**Acceptance criteria**

- Invalid submissions return `validation_failed`.
- Valid submissions produce normalized submission data.

### Task 3.3: Implement honeypot check

- Read honeypot field name from configuration.
- Mark submissions with populated honeypot field as spam.
- Avoid exposing detection details in public responses.

**Acceptance criteria**

- Populated honeypot submissions do not trigger delivery.
- Client receives a safe generic response.

### Task 3.4: Store accepted submissions in D1

- Generate stable submission ids.
- Hash client IP with a secret or deployment-specific salt.
- Capture user agent.
- Insert normalized submission into D1.

**Acceptance criteria**

- Valid submissions are persisted.
- Raw IP addresses are not stored.
- Response includes `{ ok: true, id }` for accepted submissions.

## Phase 4: Spam and Abuse Controls

### Task 4.1: Implement D1-backed rate limiting

- Build a rate-limit helper using IP hash as the key.
- Use configurable max count and window seconds.
- Increment counters atomically enough for Worker usage.
- Return `rate_limited` when limit is exceeded.

**Acceptance criteria**

- Requests over the configured limit are rejected.
- Counters reset after the configured window.

### Task 4.2: Add suspicious content checks

- Count links in message content.
- Reject or flag excessive URLs.
- Add configurable message and metadata limits.

**Acceptance criteria**

- Excessive-link submissions are flagged or rejected based on configuration.
- Normal messages are unaffected.

### Task 4.3: Add CORS allowlist

- Read allowed origins from configuration.
- Respond correctly to preflight requests.
- Reject or omit CORS headers for unknown origins.

**Acceptance criteria**

- Allowed origins can submit forms from browsers.
- Disallowed origins do not receive permissive CORS headers.

## Phase 5: Delivery Adapters

### Task 5.1: Define adapter interface

- Create a shared delivery adapter contract.
- Include submission payload, env config, and result shape.
- Add helper for recording adapter results.

**Acceptance criteria**

- Resend and webhook adapters can implement the same interface.
- Adapter results map to `sent`, `failed`, or `skipped` states.

### Task 5.2: Implement Resend adapter

- Read `RESEND_API_KEY`, `MAIL_FROM`, and `MAIL_TO` from env.
- Build readable plain-text and optional HTML email content.
- Use submitter email as reply-to when valid.
- Store delivery event and update submission status.

**Acceptance criteria**

- Configured Resend delivery sends an email.
- Missing config skips delivery without crashing.
- Failed API responses are recorded.

### Task 5.3: Implement webhook adapter

- Read `WEBHOOK_URL` and optional `WEBHOOK_SECRET` from env.
- POST normalized submission JSON.
- Sign payload with HMAC when a secret exists.
- Store delivery event and update submission status.

**Acceptance criteria**

- Configured webhook receives normalized JSON.
- Signature header is present when configured.
- Failed webhook responses are recorded.

### Task 5.4: Dispatch delivery after storage

- Run configured adapters after successful D1 insert.
- Skip adapters for spam submissions.
- Ensure delivery failure does not fail the public submission response.

**Acceptance criteria**

- Public response succeeds even if adapter delivery fails.
- D1 records reflect final delivery status.

## Phase 6: Admin API

### Task 6.1: Add admin auth guard

- Read `ADMIN_TOKEN` from env.
- Require bearer token for admin routes.
- Return stable unauthorized responses.

**Acceptance criteria**

- Admin routes reject missing or invalid tokens.
- Valid token grants access.

### Task 6.2: Implement submission list endpoint

- Add `GET /api/admin/submissions`.
- Support limit and cursor pagination.
- Support filters for status and date range.
- Support simple text search over name, email, subject, and message.

**Acceptance criteria**

- Endpoint returns paginated submission records.
- Filters produce expected results.

### Task 6.3: Implement submission detail endpoint

- Add `GET /api/admin/submissions/:id`.
- Return submission details and delivery events.
- Return `404` for unknown ids.

**Acceptance criteria**

- Detail response includes the submission and related delivery events.

### Task 6.4: Implement CSV export endpoint

- Add `GET /api/admin/export.csv`.
- Apply the same filters as the list endpoint.
- Escape CSV values correctly.
- Set appropriate response headers.

**Acceptance criteria**

- CSV opens correctly in spreadsheet tools.
- Exported rows match filtered admin results.

## Phase 7: Dashboard UI

### Task 7.1: Create minimal dashboard shell

- Add protected dashboard route.
- Build basic layout with navigation and summary area.
- Load admin API using bearer token or configured session approach.

**Acceptance criteria**

- Dashboard is not accessible without auth.
- Authenticated users can view the shell.

### Task 7.2: Build submissions table

- Display created date, name, email, subject, spam status, and delivery status.
- Add pagination controls.
- Add loading and empty states.

**Acceptance criteria**

- Table renders real D1 submissions.
- Pagination works from the UI.

### Task 7.3: Build submission detail view

- Show full message and metadata.
- Show delivery events.
- Include copy-friendly email and message fields.

**Acceptance criteria**

- Selecting a submission shows all relevant details.

### Task 7.4: Add filters and export action

- Add date and delivery-status filters.
- Add text search input.
- Add CSV export button that preserves current filters.

**Acceptance criteria**

- Filters update table results.
- Export downloads CSV matching active filters.

## Phase 8: Testing

### Task 8.1: Add unit tests for validation

- Test valid and invalid email values.
- Test required fields.
- Test message length boundaries.
- Test metadata normalization.

**Acceptance criteria**

- Validation tests pass locally.

### Task 8.2: Add tests for spam controls

- Test honeypot behavior.
- Test excessive link detection.
- Test rate-limit allowed and blocked paths.

**Acceptance criteria**

- Spam-control tests pass locally.

### Task 8.3: Add adapter tests

- Mock Resend API responses.
- Mock webhook responses.
- Test successful, failed, and skipped delivery outcomes.

**Acceptance criteria**

- Adapter tests cover result recording and status updates.

### Task 8.4: Add integration tests for admin/export

- Seed D1 test data.
- Test list, detail, filters, and CSV export.
- Test admin auth failures.

**Acceptance criteria**

- Integration tests run with local D1 or test harness.

## Phase 9: Hardening and Operations

### Task 9.1: Add consistent error handling

- Centralize public error codes.
- Avoid leaking internal exceptions.
- Log useful internal context without secrets.

**Acceptance criteria**

- Known failure modes return stable documented errors.

### Task 9.2: Add observability helpers

- Log accepted, rejected, rate-limited, and delivery-failed events.
- Add simple admin summary counts if practical.

**Acceptance criteria**

- Operators can inspect basic submission and delivery health.

### Task 9.3: Add cleanup strategy

- Add optional cleanup for old rate-limit rows.
- Document manual cleanup SQL.
- Consider scheduled Worker support for future cleanup.

**Acceptance criteria**

- Rate-limit table does not grow without a documented mitigation.

## Phase 10: Documentation and Examples

### Task 10.1: Write quick-start README

- Explain what the project does.
- Include install, D1 setup, migration, dev, and deploy commands.
- Include minimal environment variable setup.

**Acceptance criteria**

- A new user can deploy a working endpoint from the README.

### Task 10.2: Add HTML form examples

- Provide basic static HTML form.
- Provide fetch-based JavaScript example.
- Include honeypot field example.

**Acceptance criteria**

- Examples submit successfully to the Worker endpoint.

### Task 10.3: Document delivery adapters

- Add Resend setup guide.
- Add webhook setup and signing guide.
- Document skipped delivery behavior when config is missing.

**Acceptance criteria**

- Users can configure Resend or webhook delivery without reading source code.

### Task 10.4: Document security and privacy notes

- Explain IP hashing.
- Explain admin token handling.
- Explain CORS allowlist.
- Explain spam controls and limitations.

**Acceptance criteria**

- Security-sensitive behavior is documented clearly.

## Suggested Build Order

1. Project foundation and health route.
2. D1 migrations.
3. Submission parsing, validation, and storage.
4. Honeypot and rate limiting.
5. Delivery adapters.
6. Admin API and CSV export.
7. Dashboard UI.
8. Tests, hardening, and documentation.
