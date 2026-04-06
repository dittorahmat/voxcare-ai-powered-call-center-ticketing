import { DurableObject } from 'cloudflare:workers';
import type { Env } from './core-utils';

interface RateEntry {
  count: number;
  windowStart: number; // timestamp
}

export class RateLimiter extends DurableObject<Env> {
  private limits = new Map<string, RateEntry>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const key = url.searchParams.get('key') || 'unknown';
    const maxRequests = parseInt(url.searchParams.get('max') || '100');
    const windowMs = parseInt(url.searchParams.get('window') || '60000');

    const now = Date.now();
    let entry = this.limits.get(key);

    if (!entry || now - entry.windowStart > windowMs) {
      entry = { count: 0, windowStart: now };
    }

    entry.count++;
    this.limits.set(key, entry);

    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.windowStart + windowMs - now) / 1000);
      return new Response(JSON.stringify({ error: 'Rate limit exceeded', retryAfter }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
        },
      });
    }

    return new Response(JSON.stringify({ allowed: true, remaining: maxRequests - entry.count }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
