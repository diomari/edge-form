import type { Env } from '../types';
import { errorJson } from './http';
import { errorMessage, logEvent } from './logging';
import { PublicError } from './submissions';

export function handlePublicError(error: unknown, env: Env, request: Request, event = 'request_failed'): Response {
  if (error instanceof PublicError) {
    logEvent('warn', event, { code: error.code, status: error.status, path: new URL(request.url).pathname });
    return errorJson(error.code, error.status, env, request);
  }

  logEvent('error', event, { code: 'server_error', path: new URL(request.url).pathname, message: errorMessage(error) });
  return errorJson('server_error', 500, env, request);
}
