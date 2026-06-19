import type { Env, Handler, HandlerContext } from '../types';
import { methodNotAllowed, notFound, optionsResponse } from './http';

type Route = {
  method: string;
  pattern: RegExp;
  keys: string[];
  handler: Handler;
};

const routes: Route[] = [];

function compile(path: string): { pattern: RegExp; keys: string[] } {
  const keys: string[] = [];
  const source = path
    .replace(/\//g, '\\/')
    .replace(/:([A-Za-z0-9_]+)/g, (_, key: string) => {
      keys.push(key);
      return '([^/]+)';
    });
  return { pattern: new RegExp(`^${source}$`), keys };
}

export function route(method: string, path: string, handler: Handler): void {
  const compiled = compile(path);
  routes.push({ method: method.toUpperCase(), ...compiled, handler });
}

export async function dispatch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (request.method === 'OPTIONS') return optionsResponse(env, request);

  const url = new URL(request.url);
  const pathMatches = routes.filter((candidate) => candidate.pattern.test(url.pathname));
  const matched = pathMatches.find((candidate) => candidate.method === request.method.toUpperCase());

  if (!matched) {
    return pathMatches.length > 0 ? methodNotAllowed(env, request) : notFound(env, request);
  }

  const match = url.pathname.match(matched.pattern);
  const params: Record<string, string> = {};
  matched.keys.forEach((key, index) => {
    params[key] = decodeURIComponent(match?.[index + 1] ?? '');
  });

  const context: HandlerContext = { request, env, ctx, url, params };
  return matched.handler(context);
}
