import { describe, expect, it } from 'vitest';
import { exportCsv, getSubmission, listSubmissions } from '../src/routes/admin';
import { createEnv, createExecutionContext } from './helpers';

const row = {
  id: 'sub_1',
  created_at: '2026-06-18T00:00:00.000Z',
  name: 'Jane',
  email: 'jane@example.com',
  subject: 'Hello',
  message: 'Message body',
  metadata_json: '{"plan":"pro"}',
  ip_hash: 'hash',
  user_agent: 'vitest',
  spam_status: 'accepted',
  delivery_status: 'sent',
  delivery_error: null,
};

function context(url: string, token = 'secret-token', env = createEnv({}, [{ results: [row] }])) {
  const request = new Request(url, { headers: token ? { authorization: `Bearer ${token}` } : {} });
  return { request, env, ctx: createExecutionContext(), url: new URL(url), params: { id: 'sub_1' } };
}

describe('admin API and export', () => {
  it('rejects missing admin auth', async () => {
    const response = await listSubmissions(context('https://example.test/api/admin/submissions', '', createEnv()));
    expect(response.status).toBe(401);
  });

  it('lists filtered submissions', async () => {
    const env = createEnv({}, [{ results: [row] }]);
    const response = await listSubmissions(context('https://example.test/api/admin/submissions?q=jane&status=sent&limit=10', 'secret-token', env));
    const body = await response.json() as { submissions: Array<{ metadata: unknown }> };

    expect(body.submissions).toHaveLength(1);
    expect(body.submissions[0].metadata).toEqual({ plan: 'pro' });
    const call = env.DB.calls[0] as { sql: string; bindings: unknown[] };
    expect(call.sql).toContain('LIKE');
    expect(call.bindings).toContain('sent');
  });

  it('returns submission detail with delivery events', async () => {
    const env = createEnv({}, [{ first: row }, { results: [{ id: 'evt_1', status: 'sent' }] }]);
    const response = await getSubmission(context('https://example.test/api/admin/submissions/sub_1', 'secret-token', env));
    const body = await response.json() as { submission: { id: string }; delivery_events: unknown[] };

    expect(body.submission.id).toBe('sub_1');
    expect(body.delivery_events).toHaveLength(1);
  });

  it('exports CSV using matching filters', async () => {
    const env = createEnv({}, [{ results: [row] }]);
    const response = await exportCsv(context('https://example.test/api/admin/export.csv?q=jane', 'secret-token', env));
    const text = await response.text();

    expect(response.headers.get('content-type')).toContain('text/csv');
    expect(text).toContain('jane@example.com');
    expect(text).toContain('Message body');
  });
});
