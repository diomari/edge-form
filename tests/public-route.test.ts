import { describe, expect, it } from 'vitest';
import { submit } from '../src/routes/public';
import { createEnv, createExecutionContext } from './helpers';

function context(request: Request, env = createEnv()) {
  return { request, env, ctx: createExecutionContext(), url: new URL(request.url), params: {} };
}

describe('public submit route spam controls', () => {
  it('stores honeypot submissions as rejected and skips delivery', async () => {
    const env = createEnv({}, [{ first: null }]);
    const request = new Request('https://example.test/api/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'bot@example.com', message: 'Hello bot', _gotcha: 'filled' }),
    });

    const response = await submit(context(request, env));
    const body = await response.json() as { ok: boolean; id: string };

    expect(response.status).toBe(201);
    expect(body.ok).toBe(true);
    const insertCall = env.DB.calls.find((call) => String((call as { sql: string }).sql).includes('INSERT INTO submissions')) as { bindings: unknown[] };
    expect(insertCall.bindings).toContain('rejected');
    expect(insertCall.bindings).toContain('skipped');
  });

  it('returns rate_limited when the D1 counter exceeds the window limit', async () => {
    const env = createEnv({ RATE_LIMIT_MAX: '1' }, [{ first: { count: 1, window_start: new Date(Math.floor(Date.now() / 600000) * 600000).toISOString() } }]);
    const request = new Request('https://example.test/api/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'a@example.com', message: 'Hello there' }),
    });

    const response = await submit(context(request, env));
    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({ ok: false, error: 'rate_limited' });
  });
});
