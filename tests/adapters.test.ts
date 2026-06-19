import { afterEach, describe, expect, it, vi } from 'vitest';
import { runDeliveryAdapters } from '../src/adapters/delivery';
import type { NormalizedSubmission } from '../src/types';
import { createEnv } from './helpers';

const submission: NormalizedSubmission = {
  id: 'sub_1',
  createdAt: '2026-06-18T00:00:00.000Z',
  name: 'Jane',
  email: 'jane@example.com',
  subject: 'Hello',
  message: 'Message body',
  metadata: { source: 'test' },
  ipHash: 'hash',
  userAgent: 'vitest',
  spamStatus: 'accepted',
  deliveryStatus: 'pending',
  deliveryError: null,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('delivery adapters', () => {
  it('skips adapters when delivery config is missing', async () => {
    const env = createEnv();
    const results = await runDeliveryAdapters(env, submission);

    expect(results).toEqual(expect.arrayContaining([
      expect.objectContaining({ adapter: 'resend', status: 'skipped' }),
      expect.objectContaining({ adapter: 'webhook', status: 'skipped' }),
    ]));
  });

  it('records sent results for configured resend and webhook adapters', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: 'ok' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const env = createEnv({ RESEND_API_KEY: 'rk_test', MAIL_FROM: 'from@example.com', MAIL_TO: 'to@example.com', WEBHOOK_URL: 'https://webhook.test', WEBHOOK_SECRET: 'secret' });

    const results = await runDeliveryAdapters(env, submission);

    expect(results.every((result) => result.status === 'sent')).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const webhookCall = fetchMock.mock.calls.find((call) => call[0] === 'https://webhook.test');
    expect(webhookCall?.[1]?.headers.get('x-edge-form-signature')).toBeTruthy();
  });

  it('records failed results for non-2xx responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'nope' }), { status: 500 })));
    const env = createEnv({ WEBHOOK_URL: 'https://webhook.test' });

    const results = await runDeliveryAdapters(env, submission);

    expect(results).toEqual(expect.arrayContaining([expect.objectContaining({ adapter: 'webhook', status: 'failed' })]));
  });
});
