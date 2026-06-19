import type { HandlerContext } from '../types';
import { requireAdmin } from '../lib/admin';
import { cleanupRateLimits } from '../lib/cleanup';
import { toCsv } from '../lib/csv';
import { applyCors, errorJson, json } from '../lib/http';

type SubmissionRow = {
  id: string;
  created_at: string;
  name: string | null;
  email: string;
  subject: string | null;
  message: string;
  metadata_json: string;
  ip_hash: string;
  user_agent: string | null;
  spam_status: string;
  delivery_status: string;
  delivery_error: string | null;
};

export async function listSubmissions(context: HandlerContext): Promise<Response> {
  const auth = requireAdmin(context);
  if (auth) return auth;

  const { where, bindings } = buildSubmissionFilters(context.url);
  const limit = clamp(Number.parseInt(context.url.searchParams.get('limit') || '50', 10), 1, 100);
  const sql = `SELECT * FROM submissions ${where} ORDER BY created_at DESC LIMIT ?`;
  const result = await context.env.DB.prepare(sql).bind(...bindings, limit).all<SubmissionRow>();

  return json({ ok: true, submissions: (result.results ?? []).map(serializeSubmission) }, undefined, context.env, context.request);
}

export async function getAdminSummary(context: HandlerContext): Promise<Response> {
  const auth = requireAdmin(context);
  if (auth) return auth;

  const [total, accepted, rejected, flagged, rateLimitRows, deliverySent, deliveryFailed] = await Promise.all([
    count(context, 'SELECT COUNT(*) AS count FROM submissions'),
    count(context, "SELECT COUNT(*) AS count FROM submissions WHERE spam_status = 'accepted'"),
    count(context, "SELECT COUNT(*) AS count FROM submissions WHERE spam_status = 'rejected'"),
    count(context, "SELECT COUNT(*) AS count FROM submissions WHERE spam_status = 'flagged'"),
    count(context, 'SELECT COUNT(*) AS count FROM rate_limits'),
    count(context, "SELECT COUNT(*) AS count FROM submissions WHERE delivery_status = 'sent'"),
    count(context, "SELECT COUNT(*) AS count FROM submissions WHERE delivery_status = 'failed'"),
  ]);

  return json(
    {
      ok: true,
      summary: {
        submissions: { total, accepted, rejected, flagged },
        delivery: { sent: deliverySent, failed: deliveryFailed },
        rate_limits: { rows: rateLimitRows },
      },
    },
    undefined,
    context.env,
    context.request,
  );
}

export async function cleanupAdmin(context: HandlerContext): Promise<Response> {
  const auth = requireAdmin(context);
  if (auth) return auth;
  const result = await cleanupRateLimits(context.env);
  return json({ ok: true, cleanup: result }, undefined, context.env, context.request);
}

export async function getSubmission(context: HandlerContext): Promise<Response> {
  const auth = requireAdmin(context);
  if (auth) return auth;

  const submission = await context.env.DB.prepare('SELECT * FROM submissions WHERE id = ?')
    .bind(context.params.id)
    .first<SubmissionRow>();
  if (!submission) return errorJson('not_found', 404, context.env, context.request);

  const events = await context.env.DB.prepare(
    'SELECT * FROM delivery_events WHERE submission_id = ? ORDER BY created_at DESC',
  )
    .bind(context.params.id)
    .all();

  return json(
    { ok: true, submission: serializeSubmission(submission), delivery_events: events.results ?? [] },
    undefined,
    context.env,
    context.request,
  );
}

export async function exportCsv(context: HandlerContext): Promise<Response> {
  const auth = requireAdmin(context);
  if (auth) return auth;

  const { where, bindings } = buildSubmissionFilters(context.url);
  const result = await context.env.DB.prepare(`SELECT * FROM submissions ${where} ORDER BY created_at DESC`)
    .bind(...bindings)
    .all<SubmissionRow>();

  const columns = [
    'id',
    'created_at',
    'name',
    'email',
    'subject',
    'message',
    'ip_hash',
    'user_agent',
    'spam_status',
    'delivery_status',
    'delivery_error',
  ];
  const csv = toCsv((result.results ?? []) as unknown as Record<string, unknown>[], columns);
  const headers = new Headers({
    'content-type': 'text/csv; charset=utf-8',
    'content-disposition': 'attachment; filename="edge-form-submissions.csv"',
  });
  applyCors(headers, context.env, context.request);
  return new Response(csv, { headers });
}

async function count(context: HandlerContext, sql: string): Promise<number> {
  const result = await context.env.DB.prepare(sql).first<{ count: number }>();
  return result?.count ?? 0;
}

function buildSubmissionFilters(url: URL): { where: string; bindings: string[] } {
  const clauses: string[] = [];
  const bindings: string[] = [];

  const status = url.searchParams.get('status');
  if (status) {
    clauses.push('(spam_status = ? OR delivery_status = ?)');
    bindings.push(status, status);
  }

  const from = url.searchParams.get('from');
  if (from) {
    clauses.push('created_at >= ?');
    bindings.push(from);
  }

  const to = url.searchParams.get('to');
  if (to) {
    clauses.push('created_at <= ?');
    bindings.push(to);
  }

  const cursor = url.searchParams.get('cursor');
  if (cursor) {
    clauses.push('created_at < ?');
    bindings.push(cursor);
  }

  const q = url.searchParams.get('q');
  if (q) {
    const like = `%${q}%`;
    clauses.push('(name LIKE ? OR email LIKE ? OR subject LIKE ? OR message LIKE ?)');
    bindings.push(like, like, like, like);
  }

  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', bindings };
}

function serializeSubmission(row: SubmissionRow): Record<string, unknown> {
  return {
    ...row,
    metadata: parseJson(row.metadata_json),
    metadata_json: undefined,
  };
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
