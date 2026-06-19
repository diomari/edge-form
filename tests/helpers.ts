import type { Env } from '../src/types';

type MockResponse = { results?: unknown[]; first?: unknown };

export function createMockDb(responses: MockResponse[] = []): D1Database & { calls: unknown[] } {
  const calls: unknown[] = [];
  const queue = [...responses];
  const db = {
    calls,
    prepare(sql: string) {
      const call = { sql, bindings: [] as unknown[] };
      calls.push(call);
      return {
        bind(...bindings: unknown[]) {
          call.bindings = bindings;
          return this;
        },
        async run() {
          return { success: true } as D1Result;
        },
        async all<T>() {
          const next = queue.shift() ?? { results: [] };
          return { results: (next.results ?? []) as T[], success: true, meta: {} } as D1Result<T>;
        },
        async first<T>() {
          const next = queue.shift() ?? { first: null };
          return (next.first ?? null) as T | null;
        },
      };
    },
  };
  return db as unknown as D1Database & { calls: unknown[] };
}

export function createEnv(overrides: Partial<Env> = {}, responses: MockResponse[] = []): Env & { DB: D1Database & { calls: unknown[] } } {
  return {
    DB: createMockDb(responses),
    ADMIN_TOKEN: 'secret-token',
    IP_HASH_SECRET: 'test-secret',
    RATE_LIMIT_MAX: '5',
    RATE_LIMIT_WINDOW_SECONDS: '600',
    HONEYPOT_FIELD: '_gotcha',
    MESSAGE_MIN_LENGTH: '2',
    MESSAGE_MAX_LENGTH: '5000',
    MAX_LINKS: '2',
    MAX_BODY_BYTES: '65536',
    ALLOWED_ORIGINS: '*',
    ...overrides,
  };
}

export function createExecutionContext(): ExecutionContext {
  return {
    waitUntil() {},
    passThroughOnException() {},
    props: {},
  } as unknown as ExecutionContext;
}
