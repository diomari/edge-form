import type { Env } from '../types';

export function numberConfig(env: Env, key: keyof Env, fallback: number): number {
  const raw = env[key];
  if (typeof raw !== 'string') return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : fallback;
}

export function honeypotField(env: Env): string {
  return env.HONEYPOT_FIELD || '_gotcha';
}
