export interface Env {
  DB: D1Database;
  ADMIN_TOKEN?: string;
  IP_HASH_SECRET?: string;
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
  MAIL_TO?: string;
  WEBHOOK_URL?: string;
  WEBHOOK_SECRET?: string;
  RATE_LIMIT_MAX?: string;
  RATE_LIMIT_WINDOW_SECONDS?: string;
  HONEYPOT_FIELD?: string;
  MESSAGE_MIN_LENGTH?: string;
  MESSAGE_MAX_LENGTH?: string;
  MAX_LINKS?: string;
  MAX_BODY_BYTES?: string;
  ALLOWED_ORIGINS?: string;
  RATE_LIMIT_RETENTION_DAYS?: string;
}

export interface HandlerContext {
  request: Request;
  env: Env;
  ctx: ExecutionContext;
  url: URL;
  params: Record<string, string>;
}

export type Handler = (context: HandlerContext) => Response | Promise<Response>;

export interface NormalizedSubmission {
  id: string;
  createdAt: string;
  name: string | null;
  email: string;
  subject: string | null;
  message: string;
  metadata: Record<string, unknown>;
  ipHash: string;
  userAgent: string | null;
  spamStatus: 'accepted' | 'rejected' | 'flagged';
  deliveryStatus: 'pending' | 'sent' | 'failed' | 'skipped';
  deliveryError: string | null;
}

export interface DeliveryResult {
  adapter: string;
  status: 'sent' | 'failed' | 'skipped';
  response: unknown;
  error?: string;
}
