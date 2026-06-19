import { describe, expect, it } from 'vitest';
import { hasExcessiveLinks, normalizeSubmission, parseSubmissionBody, PublicError } from '../src/lib/submissions';
import { createEnv } from './helpers';

describe('submission parsing and validation', () => {
  it('parses JSON and normalizes metadata', async () => {
    const env = createEnv();
    const request = new Request('https://example.test/api/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.10' },
      body: JSON.stringify({ name: ' Jane ', email: 'JANE@EXAMPLE.COM', message: 'Hello there', company: 'Acme' }),
    });

    const fields = await parseSubmissionBody(request, env);
    const submission = await normalizeSubmission(fields, request, env, 'accepted');

    expect(submission.email).toBe('jane@example.com');
    expect(submission.name).toBe('Jane');
    expect(submission.message).toBe('Hello there');
    expect(submission.metadata).toEqual({ company: 'Acme' });
    expect(submission.ipHash).not.toBe('203.0.113.10');
  });

  it('parses urlencoded form bodies', async () => {
    const env = createEnv();
    const request = new Request('https://example.test/api/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ email: 'a@example.com', message: 'Hi there' }),
    });

    await expect(parseSubmissionBody(request, env)).resolves.toMatchObject({ email: 'a@example.com', message: 'Hi there' });
  });

  it('rejects invalid email and too-short messages', async () => {
    const env = createEnv();
    const request = new Request('https://example.test/api/submit');

    await expect(normalizeSubmission({ email: 'bad', message: 'Hello' }, request, env, 'accepted')).rejects.toMatchObject({ code: 'validation_failed' });
    await expect(normalizeSubmission({ email: 'a@example.com', message: 'x' }, request, env, 'accepted')).rejects.toMatchObject({ code: 'validation_failed' });
  });

  it('rejects unsupported content types with public errors', async () => {
    const env = createEnv();
    const request = new Request('https://example.test/api/submit', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'hello',
    });

    await expect(parseSubmissionBody(request, env)).rejects.toBeInstanceOf(PublicError);
  });
});

describe('spam helpers', () => {
  it('detects excessive links by configured limit', () => {
    const env = createEnv({ MAX_LINKS: '1' });
    expect(hasExcessiveLinks('Visit https://a.test and www.b.test', env)).toBe(true);
    expect(hasExcessiveLinks('Visit https://a.test', env)).toBe(false);
  });
});
