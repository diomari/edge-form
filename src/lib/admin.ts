import type { HandlerContext } from '../types';
import { errorJson } from './http';

export function requireAdmin(context: HandlerContext): Response | null {
  const token = context.env.ADMIN_TOKEN;
  if (!token) return errorJson('admin_not_configured', 503, context.env, context.request);

  const header = context.request.headers.get('authorization') ?? '';
  const expected = `Bearer ${token}`;
  if (header !== expected) return errorJson('unauthorized', 401, context.env, context.request);

  return null;
}
