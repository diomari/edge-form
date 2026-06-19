import type { HandlerContext } from '../types';
import { runDeliveryAdapters } from '../adapters/delivery';
import { honeypotField } from '../lib/config';
import { hashIp } from '../lib/crypto';
import { handlePublicError } from '../lib/errors';
import { errorJson, json } from '../lib/http';
import { logEvent } from '../lib/logging';
import { checkRateLimit } from '../lib/rateLimit';
import { hasExcessiveLinks, insertSubmission, normalizeSubmission, parseSubmissionBody } from '../lib/submissions';

export function health(context: HandlerContext): Response {
  return json({ ok: true, service: 'edge-form' }, undefined, context.env, context.request);
}

export async function submit(context: HandlerContext): Promise<Response> {
  try {
    const fields = await parseSubmissionBody(context.request, context.env);
    const ipHash = await hashIp(context.request, context.env);
    const rateLimit = await checkRateLimit(context.env, ipHash);
    if (!rateLimit.allowed) {
      logEvent('warn', 'submission_rate_limited', { ip_hash: ipHash });
      return errorJson('rate_limited', 429, context.env, context.request);
    }

    const honeypotValue = fields[honeypotField(context.env)]?.trim();
    const spamStatus = honeypotValue ? 'rejected' : hasExcessiveLinks(fields.message ?? '', context.env) ? 'flagged' : 'accepted';
    const submission = await normalizeSubmission(fields, context.request, context.env, spamStatus);
    await insertSubmission(context.env, submission);
    logEvent('info', 'submission_stored', {
      submission_id: submission.id,
      spam_status: submission.spamStatus,
      delivery_status: submission.deliveryStatus,
    });

    if (submission.spamStatus === 'accepted') {
      context.ctx.waitUntil(runDeliveryAdapters(context.env, submission));
    }

    return json({ ok: true, id: submission.id }, { status: 201 }, context.env, context.request);
  } catch (error) {
    return handlePublicError(error, context.env, context.request, 'submit_failed');
  }
}
