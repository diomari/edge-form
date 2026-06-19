import { cleanupRateLimits } from './lib/cleanup';
import { dispatch, route } from './lib/router';
import { cleanupAdmin, exportCsv, getAdminSummary, getSubmission, listSubmissions } from './routes/admin';
import { dashboard } from './routes/dashboard';
import { health, submit } from './routes/public';
import type { Env } from './types';

route('GET', '/health', health);
route('GET', '/admin', dashboard);
route('POST', '/api/submit', submit);
route('GET', '/api/admin/summary', getAdminSummary);
route('GET', '/api/admin/submissions', listSubmissions);
route('GET', '/api/admin/submissions/:id', getSubmission);
route('GET', '/api/admin/export.csv', exportCsv);
route('POST', '/api/admin/cleanup', cleanupAdmin);

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      return await dispatch(request, env, ctx);
    } catch (error) {
      console.error('unhandled_error', error);
      return new Response(JSON.stringify({ ok: false, error: 'server_error' }), {
        status: 500,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      });
    }
  },

  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    await cleanupRateLimits(env);
  },
};
