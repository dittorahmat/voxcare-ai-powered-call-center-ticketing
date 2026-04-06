import { DurableObject } from 'cloudflare:workers';
import type { Customer, AuthSession, AuthTokenPayload } from './types';
import type { Env } from './core-utils';
import * as jose from 'jose';

/**
 * CustomerAuthController Durable Object
 * Handles customer registration, login, password hashing (PBKDF2),
 * JWT token generation (24h expiry), refresh token management,
 * email verification, and password reset.
 */
export class CustomerAuthController extends DurableObject<Env> {
  private customers = new Map<string, Customer>();
  private sessions = new Map<string, AuthSession>();
  private passwordResets = new Map<string, { token: string; customerId: string; expiresAt: number; createdAt: string }>();
  private loaded = false;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  private async ensureLoaded(): Promise<void> {
    if (!this.loaded) {
      const storedCustomers = await this.ctx.storage.get<Record<string, Customer>>('customers') || {};
      const storedSessions = await this.ctx.storage.get<Record<string, AuthSession>>('sessions') || {};
      const storedResets = await this.ctx.storage.get<Record<string, typeof this.passwordResets extends Map<string, infer V> ? V : never>>('passwordResets') || {};
      this.customers = new Map(Object.entries(storedCustomers));
      this.sessions = new Map(Object.entries(storedSessions));
      this.passwordResets = new Map(Object.entries(storedResets as Record<string, { token: string; customerId: string; expiresAt: number; createdAt: string }>));
      this.loaded = true;
    }
  }

  private async persistCustomers(): Promise<void> {
    await this.ctx.storage.put('customers', Object.fromEntries(this.customers));
  }

  private async persistSessions(): Promise<void> {
    await this.ctx.storage.put('sessions', Object.fromEntries(this.sessions));
  }

  private async persistPasswordResets(): Promise<void> {
    await this.ctx.storage.put('passwordResets', Object.fromEntries(this.passwordResets));
  }

  // ─── Password Hashing (PBKDF2) ─────────────────────────────

  static async hashPassword(password: string): Promise<{ hash: string; salt: string }> {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const keyMaterial = await crypto.subtle.importKey(
      'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
    );
    const derivedBits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
      keyMaterial, 256
    );
    return {
      hash: btoa(String.fromCharCode(...new Uint8Array(derivedBits))),
      salt: btoa(String.fromCharCode(...salt)),
    };
  }

  static async verifyPassword(password: string, storedHash: string, storedSalt: string): Promise<boolean> {
    const encoder = new TextEncoder();
    const salt = Uint8Array.from(atob(storedSalt), c => c.charCodeAt(0));
    const keyMaterial = await crypto.subtle.importKey(
      'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
    );
    const derivedBits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
      keyMaterial, 256
    );
    return btoa(String.fromCharCode(...new Uint8Array(derivedBits))) === storedHash;
  }

  // ─── JWT Token Generation (24h expiry for customers) ───────

  private async generateAccessToken(customer: Customer): Promise<string> {
    const secret = new TextEncoder().encode(this.env.JWT_SECRET || 'dev-secret-change-me');
    const token = await new jose.SignJWT({
      sub: customer.id,
      role: 'customer',
      name: customer.name,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);
    return token;
  }

  private generateRefreshToken(): string {
    return crypto.getRandomValues(new Uint8Array(32)).reduce((s, b) => s + b.toString(16).padStart(2, '0'), '');
  }

  // ─── Customer Registration ─────────────────────────────────

  async registerCustomer(data: { name: string; email: string; password: string; phone?: string; company?: string }): Promise<{ customer: Customer; verificationToken: string } | { error: string; code: number }> {
    await this.ensureLoaded();

    // Check duplicate email
    const existing = Array.from(this.customers.values()).find(c => c.email === data.email);
    if (existing) return { error: 'Email already registered', code: 409 };

    // Validate password strength
    if (data.password.length < 8) return { error: 'Password must be at least 8 characters', code: 400 };
    if (!/[A-Z]/.test(data.password)) return { error: 'Password must contain an uppercase letter', code: 400 };
    if (!/[a-z]/.test(data.password)) return { error: 'Password must contain a lowercase letter', code: 400 };
    if (!/[0-9]/.test(data.password)) return { error: 'Password must contain a number', code: 400 };

    const { hash, salt } = await CustomerAuthController.hashPassword(data.password);
    const verificationToken = crypto.randomUUID();
    const now = Date.now();

    const customer: Customer = {
      id: `cust-${crypto.randomUUID()}`,
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      company: data.company || null,
      tags: [],
      isVip: false,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ticketCount: 0,
      passwordHash: hash,
      passwordSalt: salt,
      isActive: false,
      lastLoginAt: null,
      emailVerifiedAt: null,
      verificationToken,
      verificationTokenExpiry: now + 24 * 60 * 60 * 1000, // 24 hours
    };

    this.customers.set(customer.id, customer);
    await this.persistCustomers();

    return { customer, verificationToken };
  }

  // ─── Email Verification ────────────────────────────────────

  async verifyEmail(token: string): Promise<{ success: boolean; customerId?: string; error?: string }> {
    await this.ensureLoaded();

    const customer = Array.from(this.customers.values()).find(c => c.verificationToken === token);
    if (!customer) return { success: false, error: 'Invalid verification token' };

    if (Date.now() > (customer.verificationTokenExpiry || 0)) {
      return { success: false, error: 'Verification token expired' };
    }

    customer.isActive = true;
    customer.emailVerifiedAt = new Date().toISOString();
    customer.verificationToken = null;
    customer.verificationTokenExpiry = null;
    this.customers.set(customer.id, customer);
    await this.persistCustomers();

    return { success: true, customerId: customer.id };
  }

  async resendVerificationEmail(customerId: string): Promise<{ success: boolean; verificationToken?: string; error?: string }> {
    await this.ensureLoaded();

    const customer = this.customers.get(customerId);
    if (!customer) return { success: false, error: 'Customer not found' };
    if (customer.emailVerifiedAt) return { success: false, error: 'Email already verified' };

    const verificationToken = crypto.randomUUID();
    customer.verificationToken = verificationToken;
    customer.verificationTokenExpiry = Date.now() + 24 * 60 * 60 * 1000;
    this.customers.set(customerId, customer);
    await this.persistCustomers();

    return { success: true, verificationToken };
  }

  // ─── Customer Login ────────────────────────────────────────

  async loginCustomer(email: string, password: string): Promise<{ accessToken: string; refreshToken: string; customer: { id: string; name: string; email: string } } | { error: string; code: number }> {
    await this.ensureLoaded();

    const customer = Array.from(this.customers.values()).find(c => c.email === email);
    if (!customer) return { error: 'Invalid credentials', code: 401 };

    if (!customer.passwordHash || !customer.passwordSalt) {
      return { error: 'Invalid credentials', code: 401 };
    }

    const valid = await CustomerAuthController.verifyPassword(password, customer.passwordHash, customer.passwordSalt);
    if (!valid) return { error: 'Invalid credentials', code: 401 };

    if (!customer.isActive) {
      return { error: 'Please verify your email first', code: 403 };
    }

    // Update last login
    customer.lastLoginAt = new Date().toISOString();
    this.customers.set(customer.id, customer);
    await this.persistCustomers();

    // Generate tokens
    const accessToken = await this.generateAccessToken(customer);
    const refreshToken = this.generateRefreshToken();

    const session: AuthSession = {
      userId: customer.id,
      refreshToken,
      refreshTokenExpiry: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      createdAt: Date.now(),
      revoked: false,
    };
    this.sessions.set(refreshToken, session);
    await this.persistSessions();

    return {
      accessToken,
      refreshToken,
      customer: { id: customer.id, name: customer.name, email: customer.email! },
    };
  }

  // ─── Refresh Token ─────────────────────────────────────────

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string } | { error: string; code: number }> {
    await this.ensureLoaded();

    const session = this.sessions.get(refreshToken);
    if (!session || session.revoked) return { error: 'Invalid refresh token', code: 401 };
    if (Date.now() > session.refreshTokenExpiry) return { error: 'Refresh token expired', code: 401 };

    const customer = this.customers.get(session.userId);
    if (!customer || !customer.isActive) return { error: 'Customer not found or inactive', code: 401 };

    const accessToken = await this.generateAccessToken(customer);
    return { accessToken };
  }

  async logoutCustomer(refreshToken: string): Promise<{ success: boolean }> {
    await this.ensureLoaded();
    const session = this.sessions.get(refreshToken);
    if (session) {
      session.revoked = true;
      this.sessions.set(refreshToken, session);
      await this.persistSessions();
    }
    return { success: true };
  }

  // ─── Password Reset ────────────────────────────────────────

  async requestPasswordReset(email: string): Promise<{ success: boolean; resetToken?: string }> {
    await this.ensureLoaded();

    const customer = Array.from(this.customers.values()).find(c => c.email === email);
    const resetToken = crypto.randomUUID();

    if (customer && customer.isActive) {
      this.passwordResets.set(resetToken, {
        token: resetToken,
        customerId: customer.id,
        expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
        createdAt: new Date().toISOString(),
      });
      await this.persistPasswordResets();
    }

    // Always return success (don't leak whether email exists)
    return { success: true, resetToken };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; error?: string; code?: number }> {
    await this.ensureLoaded();

    const reset = this.passwordResets.get(token);
    if (!reset) return { success: false, error: 'Invalid reset token', code: 400 };
    if (Date.now() > reset.expiresAt) {
      this.passwordResets.delete(token);
      await this.persistPasswordResets();
      return { success: false, error: 'Reset token expired', code: 400 };
    }

    // Validate password
    if (newPassword.length < 8) return { success: false, error: 'Password must be at least 8 characters', code: 400 };
    if (!/[A-Z]/.test(newPassword)) return { success: false, error: 'Password must contain an uppercase letter', code: 400 };
    if (!/[a-z]/.test(newPassword)) return { success: false, error: 'Password must contain a lowercase letter', code: 400 };
    if (!/[0-9]/.test(newPassword)) return { success: false, error: 'Password must contain a number', code: 400 };

    const customer = this.customers.get(reset.customerId);
    if (!customer) return { success: false, error: 'Customer not found', code: 404 };

    const { hash, salt } = await CustomerAuthController.hashPassword(newPassword);
    customer.passwordHash = hash;
    customer.passwordSalt = salt;
    this.customers.set(customer.id, customer);
    await this.persistCustomers();

    // Revoke all sessions
    for (const [key, session] of this.sessions) {
      if (session.userId === customer.id) {
        session.revoked = true;
        this.sessions.set(key, session);
      }
    }
    await this.persistSessions();

    this.passwordResets.delete(token);
    await this.persistPasswordResets();

    return { success: true };
  }

  // ─── Password Change ───────────────────────────────────────

  async changePassword(customerId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string; code?: number }> {
    await this.ensureLoaded();

    const customer = this.customers.get(customerId);
    if (!customer || !customer.passwordHash || !customer.passwordSalt) {
      return { success: false, error: 'Customer not found', code: 404 };
    }

    const valid = await CustomerAuthController.verifyPassword(currentPassword, customer.passwordHash, customer.passwordSalt);
    if (!valid) return { success: false, error: 'Current password is incorrect', code: 401 };

    // Validate new password
    if (newPassword.length < 8) return { success: false, error: 'Password must be at least 8 characters', code: 400 };
    if (!/[A-Z]/.test(newPassword)) return { success: false, error: 'Password must contain an uppercase letter', code: 400 };
    if (!/[a-z]/.test(newPassword)) return { success: false, error: 'Password must contain a lowercase letter', code: 400 };
    if (!/[0-9]/.test(newPassword)) return { success: false, error: 'Password must contain a number', code: 400 };

    const { hash, salt } = await CustomerAuthController.hashPassword(newPassword);
    customer.passwordHash = hash;
    customer.passwordSalt = salt;
    this.customers.set(customerId, customer);
    await this.persistCustomers();

    return { success: true };
  }

  // ─── Cleanup ───────────────────────────────────────────────

  async cleanupExpiredResets(): Promise<void> {
    await this.ensureLoaded();
    const now = Date.now();
    for (const [token, reset] of this.passwordResets) {
      if (now > reset.expiresAt) this.passwordResets.delete(token);
    }
    await this.persistPasswordResets();
  }
}
