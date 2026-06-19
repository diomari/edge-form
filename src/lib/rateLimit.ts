import type { Env } from '../types';
import { numberConfig } from './config';

export async function checkRateLimit(env: Env, key: string): Promise<{ allowed: boolean; remaining: number }> {
  const max = numberConfig(env, 'RATE_LIMIT_MAX', 5);
  const windowSeconds = numberConfig(env, 'RATE_LIMIT_WINDOW_SECONDS', 600);
  const now = Date.now();
  const windowStartMs = Math.floor(now / (windowSeconds * 1000)) * windowSeconds * 1000;
  const windowStart = new Date(windowStartMs).toISOString();
  const updatedAt = new Date(now).toISOString();

  const existing = await env.DB.prepare('SELECT count, window_start FROM rate_limits WHERE key = ?')
    .bind(key)
    .first<{ count: number; window_start: string }>();

  if (!existing || existing.window_start !== windowStart) {
    await env.DB.prepare(
      'INSERT OR REPLACE INTO rate_limits (key, window_start, count, updated_at) VALUES (?, ?, 1, ?)',
    )
      .bind(key, windowStart, updatedAt)
      .run();
    return { allowed: true, remaining: Math.max(0, max - 1) };
  }

  const nextCount = existing.count + 1;
  await env.DB.prepare('UPDATE rate_limits SET count = ?, updated_at = ? WHERE key = ?')
    .bind(nextCount, updatedAt, key)
    .run();

  return { allowed: nextCount <= max, remaining: Math.max(0, max - nextCount) };
}
