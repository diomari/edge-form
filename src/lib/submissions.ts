import type { Env, NormalizedSubmission } from '../types';
import { numberConfig } from './config';
import { hashIp } from './crypto';

const reservedFields = new Set(['name', 'email', 'subject', 'message']);

export class PublicError extends Error {
  constructor(public code: string, public status = 400) {
    super(code);
  }
}

export async function parseSubmissionBody(request: Request, env: Env): Promise<Record<string, string>> {
  const maxBytes = numberConfig(env, 'MAX_BODY_BYTES', 65_536);
  const length = request.headers.get('content-length');
  if (length && Number.parseInt(length, 10) > maxBytes) throw new PublicError('request_too_large', 413);

  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';

  if (contentType.includes('multipart/form-data')) {
    const data = await request.formData();
    const record: Record<string, string> = {};
    data.forEach((value, key) => {
      if (typeof value === 'string') record[key] = value;
    });
    return record;
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new PublicError('request_too_large', 413);

  if (contentType.includes('application/json')) {
    try {
      const parsed = JSON.parse(text) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('bad json');
      return stringifyRecord(parsed as Record<string, unknown>);
    } catch {
      throw new PublicError('invalid_request', 400);
    }
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const data = new URLSearchParams(text);
    const record: Record<string, string> = {};
    data.forEach((value, key) => {
      record[key] = value;
    });
    return record;
  }

  throw new PublicError('unsupported_content_type', 415);
}

function stringifyRecord(input: Record<string, unknown>): Record<string, string> {
  const output: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === null || value === undefined) continue;
    output[key] = typeof value === 'string' ? value : JSON.stringify(value);
  }
  return output;
}

export async function normalizeSubmission(
  fields: Record<string, string>,
  request: Request,
  env: Env,
  spamStatus: NormalizedSubmission['spamStatus'],
): Promise<NormalizedSubmission> {
  const minMessage = numberConfig(env, 'MESSAGE_MIN_LENGTH', 1);
  const maxMessage = numberConfig(env, 'MESSAGE_MAX_LENGTH', 5000);
  const email = (fields.email ?? '').trim().toLowerCase();
  const message = (fields.message ?? '').trim();

  if (!isEmail(email) || message.length < minMessage || message.length > maxMessage) {
    throw new PublicError('validation_failed', 422);
  }

  const metadata: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (!reservedFields.has(key) && !key.startsWith('_')) metadata[key] = value;
  }

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    name: cleanOptional(fields.name),
    email,
    subject: cleanOptional(fields.subject),
    message,
    metadata,
    ipHash: await hashIp(request, env),
    userAgent: request.headers.get('user-agent'),
    spamStatus,
    deliveryStatus: spamStatus === 'accepted' ? 'pending' : 'skipped',
    deliveryError: null,
  };
}

export function hasExcessiveLinks(message: string, env: Env): boolean {
  const maxLinks = numberConfig(env, 'MAX_LINKS', 5);
  const matches = message.match(/https?:\/\/|www\./gi);
  return (matches?.length ?? 0) > maxLinks;
}

function cleanOptional(value: string | undefined): string | null {
  const cleaned = (value ?? '').trim();
  return cleaned.length > 0 ? cleaned.slice(0, 500) : null;
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 320;
}

export async function insertSubmission(env: Env, submission: NormalizedSubmission): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO submissions (
      id, created_at, name, email, subject, message, metadata_json, ip_hash,
      user_agent, spam_status, delivery_status, delivery_error
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      submission.id,
      submission.createdAt,
      submission.name,
      submission.email,
      submission.subject,
      submission.message,
      JSON.stringify(submission.metadata),
      submission.ipHash,
      submission.userAgent,
      submission.spamStatus,
      submission.deliveryStatus,
      submission.deliveryError,
    )
    .run();
}
