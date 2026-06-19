# Vitest Guide

This project uses [Vitest](https://vitest.dev/) for unit and lightweight integration-style tests.

## Install

Vitest is already included in `devDependencies`:

```json
"vitest": "^3.2.4"
```

## Run tests

Run the full suite:

```sh
npm test
```

Run TypeScript checks before tests:

```sh
npm run typecheck
npm test
```

## Current test coverage

The project currently tests these areas:

- `tests/validation.test.ts`
  - JSON and URL-encoded body parsing
  - email/message validation
  - metadata normalization
  - unsupported content type errors
  - link-spam detection

- `tests/public-route.test.ts`
  - honeypot rejection flow
  - rate-limit rejection flow

- `tests/adapters.test.ts`
  - skipped delivery when config is missing
  - successful Resend/webhook delivery
  - failed webhook delivery

- `tests/admin.test.ts`
  - admin auth enforcement
  - filtered submission listing
  - submission detail with delivery events
  - CSV export

## Test helpers

Shared mocks live in:

- `tests/helpers.ts`

Helpers provided:

- `createMockDb()` — minimal D1 mock with captured SQL calls
- `createEnv()` — test Worker env with defaults
- `createExecutionContext()` — mock Worker execution context

## Testing patterns used in this project

### 1. Route handler tests

Route handlers are tested directly by building a `Request` and passing a mocked context.

Example:

```ts
const request = new Request('https://example.test/api/submit', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'a@example.com', message: 'Hello there' }),
});

const response = await submit({
  request,
  env,
  ctx: createExecutionContext(),
  url: new URL(request.url),
  params: {},
});
```

Use this pattern for:

- public endpoints
- admin endpoints
- error handling branches
- auth behavior

### 2. D1 mocking

Tests avoid a real D1 instance by mocking `env.DB.prepare(...).bind(...).run/all/first()`.

Use queued responses to simulate reads:

```ts
const env = createEnv({}, [
  { first: row },
  { results: [{ id: 'evt_1', status: 'sent' }] },
]);
```

Use `env.DB.calls` to assert SQL or bindings:

```ts
const call = env.DB.calls[0] as { sql: string; bindings: unknown[] };
expect(call.sql).toContain('LIKE');
```

### 3. Fetch mocking

External adapters are tested with `vi.stubGlobal('fetch', ...)`.

Example:

```ts
vi.stubGlobal('fetch', vi.fn(async () => {
  return new Response(JSON.stringify({ id: 'ok' }), { status: 200 });
}));
```

Restore mocks after each test:

```ts
afterEach(() => {
  vi.restoreAllMocks();
});
```

## How to add a new test

1. Create or update a file in `tests/`.
2. Import `describe`, `it`, `expect`, and `vi` as needed from `vitest`.
3. Reuse `createEnv()` and `createExecutionContext()` for Worker code.
4. Mock D1 or `fetch` instead of hitting real services.
5. Assert both response output and side effects where possible.

## Suggested file naming

- `*.test.ts` for test files
- one file per feature area

Recommended future files:

- `tests/dashboard.test.ts`
- `tests/cleanup.test.ts`
- `tests/errors.test.ts`

## Recommended future coverage

Add tests for:

- `/api/admin/summary`
- `/api/admin/cleanup`
- scheduled cleanup behavior
- dashboard HTML response
- CORS behavior
- multipart form parsing
- structured error handling paths

## Troubleshooting

### Tests fail with type errors

Run:

```sh
npm run typecheck
```

### Tests fail after API changes

Update:

- request payloads
- mocked D1 responses
- expected response JSON
- SQL binding assertions

### External adapter tests behave unexpectedly

Check that:

- `fetch` is stubbed in the test
- `vi.restoreAllMocks()` runs after each test
- env vars like `WEBHOOK_URL` or `RESEND_API_KEY` are set in `createEnv()` overrides
