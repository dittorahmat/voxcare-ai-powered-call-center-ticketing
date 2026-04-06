import { jwt } from 'hono/jwt';
import type { JwtVariables } from 'hono/jwt';
import type { MiddlewareHandler, Context, Env as HonoEnv } from 'hono';
import type { AuthTokenPayload, UserRole } from './types';

export type AuthEnv = { JWT_SECRET: string } & JwtVariables;

/**
 * JWT authentication middleware.
 * Validates the Authorization header Bearer token and injects the user identity
 * into the request context via c.get('jwtPayload').
 */
export function authMiddleware(): MiddlewareHandler<{ Variables: JwtVariables & { user: AuthTokenPayload } }> {
  const jwtMiddleware = jwt({
    secret: (c) => {
      const env = (c.env as any);
      return env.JWT_SECRET || 'dev-secret-change-me';
    },
  });

  return async (c, next) => {
    const result = await jwtMiddleware(c, next);
    // Extract JWT payload and store as 'user' in context for easier access
    const jwtPayload = c.get('jwtPayload') as any;
    if (jwtPayload) {
      const userPayload: AuthTokenPayload = {
        sub: jwtPayload.sub,
        role: jwtPayload.role,
        name: jwtPayload.name,
        iat: jwtPayload.iat,
        exp: jwtPayload.exp,
      };
      c.set('user' as any, userPayload);
    }
    return result;
  };
}

/**
 * Role-based authorization middleware.
 * Checks that the authenticated user has one of the required roles.
 * Must be used after authMiddleware().
 */
export function requireRole(...allowedRoles: UserRole[]): MiddlewareHandler {
  return async (c, next) => {
    const user = c.get('user' as any) as AuthTokenPayload | undefined;
    if (!user) {
      return c.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    if (!allowedRoles.includes(user.role)) {
      return c.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    return next();
  };
}

/**
 * Get the authenticated user from context. Throws if not authenticated.
 */
export function getUser(c: Context): AuthTokenPayload {
  const user = c.get('user' as any) as AuthTokenPayload | undefined;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user;
}

/**
 * Optional auth middleware — sets user if token is present, but doesn't require it.
 */
export function optionalAuthMiddleware(): MiddlewareHandler<{ Variables: { user?: AuthTokenPayload } }> {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7);
        const secret = (c.env as any).JWT_SECRET || 'dev-secret-change-me';
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
          'raw',
          encoder.encode(secret),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['verify']
        );
        const { payload } = await jose.jwtVerify(token, key);
        c.set('user' as any, {
          sub: payload.sub,
          role: payload.role,
          name: payload.name,
          iat: payload.iat!,
          exp: payload.exp!,
        } as AuthTokenPayload);
      } catch {
        // Token invalid — ignore, auth is optional
      }
    }
    return next();
  };
}

// Import jose for optional auth
import * as jose from 'jose';
