import type { Env } from '../types';
import { numberConfig } from './config';
import { logEvent } from './logging';

export async function cleanupRateLimits(env: Env): Promise<{ deleted: number; before: string }> {
  const retentionDays = numberConfig(env, 'RATE_LIMIT_RETENTION_DAYS', 7);
  const before = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  const result = await env.DB.prepare('DELETE FROM rate_limits WHERE updated_at < ?').bind(before).run();
  const deleted = result.meta?.changes ?? 0;
  logEvent('info', 'rate_limits_cleanup', { deleted, before });
  return { deleted, before };
}
