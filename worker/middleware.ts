import { MiddlewareHandler } from 'hono';
import type { Env } from './core-utils';

/**
 * IP capture middleware — extracts cf-connecting-ip and stores in context
 */
export function captureIp(): MiddlewareHandler<{ Bindings: Env; Variables: { clientIp?: string } }> {
  return async (c, next) => {
    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    c.set('clientIp' as any, ip);
    return next();
  };
}

/**
 * Rate limiting middleware — checks against RateLimiter DO
 */
export function rateLimit(maxRequests: number = 100, windowMs: number = 60000): MiddlewareHandler<{ Bindings: Env; Variables: { clientIp?: string } }> {
  return async (c, next) => {
    const ip = c.get('clientIp' as any) || 'unknown';
    try {
      const id = c.env.RATE_LIMITER.idFromName(`rl-${ip}`);
      const stub = c.env.RATE_LIMITER.get(id);
      const res = await stub.fetch(new Request(`http://rate-limiter?key=${encodeURIComponent(ip)}&max=${maxRequests}&window=${windowMs}`));
      if (res.status === 429) {
        const body = await res.json();
        return c.json({ success: false, error: 'Rate limit exceeded', retryAfter: body.retryAfter }, { status: 429 });
      }
    } catch {
      // If rate limiter is unavailable, allow request through
    }
    return next();
  };
}
