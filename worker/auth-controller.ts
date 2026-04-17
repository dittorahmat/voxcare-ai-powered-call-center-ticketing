import { DurableObject } from 'cloudflare:workers';
import type { User, AuthSession, AuthTokenPayload } from './types';
import type { Env } from './core-utils';
import * as jose from 'jose';

/**
 * AuthController Durable Object
 * Handles user CRUD, password hashing (PBKDF2), JWT token generation/verification,
 * and session (refresh token) management.
 */
export class AuthController extends DurableObject<Env> {
  private users = new Map<string, User>();
  private sessions = new Map<string, AuthSession>();
  private loaded = false;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  private async ensureLoaded(): Promise<void> {
    if (!this.loaded) {
      const storedUsers = await this.ctx.storage.get<Record<string, User>>('users') || {};
      const storedSessions = await this.ctx.storage.get<Record<string, AuthSession>>('sessions') || {};
      this.users = new Map(Object.entries(storedUsers));
      this.sessions = new Map(Object.entries(storedSessions));

      // Seed demo users if empty
      if (this.users.size === 0) {
        const demoUsers = [
          { email: 'admin@voxcare.com', password: 'admin123', name: 'System Admin', role: 'admin' },
          { email: 'supervisor@voxcare.com', password: 'super123', name: 'Team Supervisor', role: 'supervisor' },
          { email: 'agent@voxcare.com', password: 'agent123', name: 'Support Agent', role: 'agent' },
        ];

        for (const u of demoUsers) {
          const { hash, salt } = await AuthController.hashPassword(u.password);
          const user: User = {
            id: crypto.randomUUID(),
            email: u.email,
            name: u.name,
            role: u.role as any,
            passwordHash: hash,
            passwordSalt: salt,
            availability: 'available',
            skills: u.role === 'agent' ? ['technical', 'billing'] : [],
            lastAssignedAt: null,
            totpSecret: null,
            is2faEnabled: false,
            notificationPrefs: {
              soundEnabled: true,
              desktopEnabled: true,
              emailEnabled: true,
              eventToggles: {},
            },
            active: true,
            createdAt: new Date().toISOString(),
          };
          this.users.set(user.id, user);
        }
        await this.persistUsers();
      }

      this.loaded = true;
    }
  }

  private async persistUsers(): Promise<void> {
    await this.ctx.storage.put('users', Object.fromEntries(this.users));
  }

  private async persistSessions(): Promise<void> {
    await this.ctx.storage.put('sessions', Object.fromEntries(this.sessions));
  }

  // ─── Password Hashing (PBKDF2) ─────────────────────────────

  /**
   * Hash a password using PBKDF2 with Web Crypto API.
   * Returns { hash: base64, salt: base64 }
   */
  static async hashPassword(password: string): Promise<{ hash: string; salt: string }> {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100_000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );

    // Use base64 encoding that is robust in Worker environment
    const hashBase64 = btoa(String.fromCharCode(...new Uint8Array(derivedBits)));
    const saltBase64 = btoa(String.fromCharCode(...salt));

    return { hash: hashBase64, salt: saltBase64 };
  }

  /**
   * Verify a password against a stored hash and salt.
   */
  static async verifyPassword(password: string, storedHash: string, storedSalt: string): Promise<boolean> {
    try {
      const encoder = new TextEncoder();
      const salt = Uint8Array.from(atob(storedSalt), c => c.charCodeAt(0));
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
      );
      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt,
          iterations: 100_000,
          hash: 'SHA-256',
        },
        keyMaterial,
        256
      );
      const computedHash = btoa(String.fromCharCode(...new Uint8Array(derivedBits)));
      return computedHash === storedHash;
    } catch (e) {
      console.error('Password verification failed:', e);
      return false;
    }
  }

  // ─── JWT Token Generation ──────────────────────────────────

  /**
   * Generate an access token (JWT, 1-hour expiry).
   */
  async generateAccessToken(user: User): Promise<string> {
    const secret = (this.env as any)?.JWT_SECRET || 'dev-secret-change-me';
    const secretKey = new TextEncoder().encode(secret);

    const token = await new jose.SignJWT({
      sub: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(secretKey);
    
    return token;
  }

  /**
   * Generate a refresh token (random string, 7-day expiry tracked in storage).
   */
  generateRefreshToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Store a refresh token session.
   */
  async storeSession(userId: string, refreshToken: string): Promise<void> {
    await this.ensureLoaded();
    const session: AuthSession = {
      userId,
      refreshToken,
      refreshTokenExpiry: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      createdAt: Date.now(),
      revoked: false,
    };
    this.sessions.set(refreshToken, session);
    await this.persistSessions();
  }

  /**
   * Validate a refresh token and return the session.
   */
  async validateRefreshToken(refreshToken: string): Promise<AuthSession | null> {
    await this.ensureLoaded();
    const session = this.sessions.get(refreshToken);
    if (!session) return null;
    if (session.revoked) return null;
    if (Date.now() > session.refreshTokenExpiry) return null;
    return session;
  }

  /**
   * Revoke a refresh token.
   */
  async revokeToken(refreshToken: string): Promise<boolean> {
    await this.ensureLoaded();
    const session = this.sessions.get(refreshToken);
    if (!session) return false;
    session.revoked = true;
    this.sessions.set(refreshToken, session);
    await this.persistSessions();
    return true;
  }

  /**
   * Revoke all sessions for a user.
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.ensureLoaded();
    for (const [token, session] of this.sessions) {
      if (session.userId === userId) {
        session.revoked = true;
        this.sessions.set(token, session);
      }
    }
    await this.persistSessions();
  }

  // ─── User CRUD ─────────────────────────────────────────────

  async createUser(user: User): Promise<void> {
    await this.ensureLoaded();
    this.users.set(user.id, user);
    await this.persistUsers();
  }

  async getUser(id: string): Promise<User | null> {
    await this.ensureLoaded();
    return this.users.get(id) || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    await this.ensureLoaded();
    return Array.from(this.users.values()).find(u => u.email.toLowerCase() === email.toLowerCase() && u.active) || null;
  }

  async listUsers(): Promise<User[]> {
    await this.ensureLoaded();
    return Array.from(this.users.values());
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    await this.ensureLoaded();
    const user = this.users.get(id);
    if (!user) return null;
    // Don't allow updating password via this method (use dedicated method)
    const { passwordHash, passwordSalt, ...safeUpdates } = updates as any;
    const updated = { ...user, ...safeUpdates };
    this.users.set(id, updated);
    await this.persistUsers();
    return updated;
  }

  async updatePassword(id: string, newPassword: string): Promise<boolean> {
    await this.ensureLoaded();
    const user = this.users.get(id);
    if (!user) return false;
    const { hash, salt } = await AuthController.hashPassword(newPassword);
    user.passwordHash = hash;
    user.passwordSalt = salt;
    this.users.set(id, user);
    await this.persistUsers();
    // Revoke all sessions on password change
    await this.revokeAllUserSessions(id);
    return true;
  }

  async deactivateUser(id: string): Promise<User | null> {
    return this.updateUser(id, { active: false } as any);
  }
}
