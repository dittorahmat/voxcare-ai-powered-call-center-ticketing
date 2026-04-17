import { jwt } from 'hono/jwt';
import type { JwtVariables } from 'hono/jwt';
import type { MiddlewareHandler, Context, Env as HonoEnv } from 'hono';
import type { AuthTokenPayload, UserRole } from './types';
import * as jose from 'jose';

export type AuthEnv = { JWT_SECRET: string } & JwtVariables;

/**
 * JWT authentication middleware.
 * Validates the Authorization header Bearer token and injects the user identity
 * into the request context via c.get('user').
 */
export function authMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    let token = '';
    const authHeader = c.req.header('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else {
      // Fallback to query parameter for SSE/EventSource support
      token = c.req.query('token') || '';
    }

    if (!token) {
      return c.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    try {
      const secret = (c.env as any).JWT_SECRET || 'dev-secret-change-me';
      const secretKey = new TextEncoder().encode(secret);

      const { payload } = await jose.jwtVerify(token, secretKey);
      
      if (!payload.sub || !payload.role) {
        console.error('[Auth] Token payload missing required fields:', payload);
        return c.json({ success: false, error: 'Invalid token payload' }, { status: 401 });
      }

      const userPayload: AuthTokenPayload = {
        sub: payload.sub as string,
        role: payload.role as UserRole,
        name: (payload.name as string) || '',
        email: (payload.email as string) || '',
        iat: (payload.iat as number) || 0,
        exp: (payload.exp as number) || 0,
      };
      
      c.set('user' as any, userPayload);
      c.set('jwtPayload' as any, payload);
      return next();
    } catch (e) {
      console.error('[Auth] JWT verification failed:', e);
      return c.json({ success: false, error: 'Invalid or expired token' }, { status: 401 });
    }
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
        const secretKey = new TextEncoder().encode(secret);
        const { payload } = await jose.jwtVerify(token, secretKey);
        
        c.set('user' as any, {
          sub: payload.sub,
          role: payload.role,
          name: payload.name || '',
          email: payload.email || '',
          iat: payload.iat || 0,
          exp: payload.exp || 0,
        } as AuthTokenPayload);
      } catch {
        // Token invalid — ignore, auth is optional
      }
    }
    return next();
  };
}
