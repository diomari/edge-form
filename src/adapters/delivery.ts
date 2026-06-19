import type { DeliveryResult, Env, NormalizedSubmission } from '../types';
import { hmacSha256Hex } from '../lib/crypto';
import { logEvent } from '../lib/logging';

export async function runDeliveryAdapters(env: Env, submission: NormalizedSubmission): Promise<DeliveryResult[]> {
  const results = await Promise.all([sendResend(env, submission), sendWebhook(env, submission)]);
  for (const result of results) {
    await recordDeliveryResult(env, submission.id, result);
    logEvent(result.status === 'failed' ? 'error' : 'info', 'delivery_adapter_result', {
      submission_id: submission.id,
      adapter: result.adapter,
      status: result.status,
      error: result.error,
    });
  }

  const failures = results.filter((result) => result.status === 'failed');
  const sent = results.some((result) => result.status === 'sent');
  const configured = results.some((result) => result.status !== 'skipped');
  const finalStatus = sent ? 'sent' : configured && failures.length > 0 ? 'failed' : 'skipped';
  const error = failures.map((failure) => failure.error).filter(Boolean).join('; ') || null;

  await env.DB.prepare('UPDATE submissions SET delivery_status = ?, delivery_error = ? WHERE id = ?')
    .bind(finalStatus, error, submission.id)
    .run();

  return results;
}

async function sendResend(env: Env, submission: NormalizedSubmission): Promise<DeliveryResult> {
  if (!env.RESEND_API_KEY || !env.MAIL_FROM || !env.MAIL_TO) {
    return { adapter: 'resend', status: 'skipped', response: { reason: 'missing_config' } };
  }

  const subject = submission.subject || `New contact form submission from ${submission.name || submission.email}`;
  const body = [
    `Name: ${submission.name || ''}`,
    `Email: ${submission.email}`,
    `Subject: ${submission.subject || ''}`,
    '',
    submission.message,
    '',
    `Submission ID: ${submission.id}`,
    `Created: ${submission.createdAt}`,
  ].join('\n');

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to: [env.MAIL_TO],
        subject,
        text: body,
        reply_to: submission.email,
      }),
    });
    const payload = await safeJson(response);
    if (!response.ok) {
      return { adapter: 'resend', status: 'failed', response: payload, error: `resend_${response.status}` };
    }
    return { adapter: 'resend', status: 'sent', response: payload };
  } catch (error) {
    return { adapter: 'resend', status: 'failed', response: null, error: String(error) };
  }
}

async function sendWebhook(env: Env, submission: NormalizedSubmission): Promise<DeliveryResult> {
  if (!env.WEBHOOK_URL) {
    return { adapter: 'webhook', status: 'skipped', response: { reason: 'missing_config' } };
  }

  const body = JSON.stringify({
    id: submission.id,
    created_at: submission.createdAt,
    name: submission.name,
    email: submission.email,
    subject: submission.subject,
    message: submission.message,
    metadata: submission.metadata,
  });

  const headers = new Headers({ 'content-type': 'application/json' });
  if (env.WEBHOOK_SECRET) {
    headers.set('x-edge-form-signature', await hmacSha256Hex(env.WEBHOOK_SECRET, body));
  }

  try {
    const response = await fetch(env.WEBHOOK_URL, { method: 'POST', headers, body });
    const payload = await safeJson(response);
    if (!response.ok) {
      return { adapter: 'webhook', status: 'failed', response: payload, error: `webhook_${response.status}` };
    }
    return { adapter: 'webhook', status: 'sent', response: payload };
  } catch (error) {
    return { adapter: 'webhook', status: 'failed', response: null, error: String(error) };
  }
}

async function recordDeliveryResult(env: Env, submissionId: string, result: DeliveryResult): Promise<void> {
  await env.DB.prepare(
    'INSERT INTO delivery_events (id, submission_id, adapter, status, response_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(crypto.randomUUID(), submissionId, result.adapter, result.status, JSON.stringify(result.response), new Date().toISOString())
    .run();
}

async function safeJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { text };
  }
}
