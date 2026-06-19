import type { Env } from '../types';

export function json(data: unknown, init: ResponseInit = {}, env?: Env, request?: Request): Response {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  applyCors(headers, env, request);
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function errorJson(code: string, status = 400, env?: Env, request?: Request): Response {
  return json({ ok: false, error: code }, { status }, env, request);
}

export function methodNotAllowed(env: Env, request: Request): Response {
  return errorJson('method_not_allowed', 405, env, request);
}

export function notFound(env: Env, request: Request): Response {
  return errorJson('not_found', 404, env, request);
}

export function optionsResponse(env: Env, request: Request): Response {
  const headers = new Headers();
  applyCors(headers, env, request);
  headers.set('access-control-allow-methods', 'GET,POST,OPTIONS');
  headers.set('access-control-allow-headers', 'content-type,authorization');
  headers.set('access-control-max-age', '86400');
  return new Response(null, { status: 204, headers });
}

export function applyCors(headers: Headers, env?: Env, request?: Request): void {
  if (!env || !request) return;
  const origin = request.headers.get('origin');
  if (!origin) return;

  const allowed = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (allowed.includes('*')) {
    headers.set('access-control-allow-origin', '*');
    headers.set('vary', 'origin');
    return;
  }

  if (allowed.includes(origin)) {
    headers.set('access-control-allow-origin', origin);
    headers.set('vary', 'origin');
  }
}
