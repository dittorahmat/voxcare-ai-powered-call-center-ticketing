import { DurableObject } from 'cloudflare:workers';
import type { SessionInfo, Ticket } from './types';
import type { Env } from './core-utils';
export class AppController extends DurableObject<Env> {
  private sessions = new Map<string, SessionInfo>();
  private tickets = new Map<string, Ticket>();
  private loaded = false;
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }
  private async ensureLoaded(): Promise<void> {
    if (!this.loaded) {
      const storedSessions = await this.ctx.storage.get<Record<string, SessionInfo>>('sessions') || {};
      const storedTickets = await this.ctx.storage.get<Record<string, Ticket>>('tickets') || {};
      this.sessions = new Map(Object.entries(storedSessions));
      this.tickets = new Map(Object.entries(storedTickets));
      // Initialize with mock data if empty
      if (this.tickets.size === 0) {
        const mockTickets: Ticket[] = [
          {
            id: 'T-1001',
            title: 'Internet Connection Dropping',
            description: 'Customer reporting intermittent connectivity issues in the North region.',
            customerName: 'Sarah Jenkins',
            priority: 'high',
            status: 'open',
            category: 'Technical Support',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            transcript: "Agent: Hello, Sarah. How can I help?\nCustomer: My internet has been cutting out all day."
          }
        ];
        mockTickets.forEach(t => this.tickets.set(t.id, t));
        await this.ctx.storage.put('tickets', Object.fromEntries(this.tickets));
      }
      this.loaded = true;
    }
  }
  private async persistSessions(): Promise<void> {
    await this.ctx.storage.put('sessions', Object.fromEntries(this.sessions));
  }
  private async persistTickets(): Promise<void> {
    await this.ctx.storage.put('tickets', Object.fromEntries(this.tickets));
  }
  // Session Methods
  async addSession(sessionId: string, title?: string): Promise<void> {
    await this.ensureLoaded();
    const now = Date.now();
    this.sessions.set(sessionId, {
      id: sessionId,
      title: title || `Chat ${new Date(now).toLocaleDateString()}`,
      createdAt: now,
      lastActive: now
    });
    await this.persistSessions();
  }
  async removeSession(sessionId: string): Promise<boolean> {
    await this.ensureLoaded();
    const deleted = this.sessions.delete(sessionId);
    if (deleted) await this.persistSessions();
    return deleted;
  }
  async listSessions(): Promise<SessionInfo[]> {
    await this.ensureLoaded();
    return Array.from(this.sessions.values()).sort((a, b) => b.lastActive - a.lastActive);
  }
  async updateSessionTitle(sessionId: string, title: string): Promise<boolean> {
    await this.ensureLoaded();
    const session = this.sessions.get(sessionId);
    if (session) {
      session.title = title;
      await this.persistSessions();
      return true;
    }
    return false;
  }
  // Ticket Methods
  async listTickets(): Promise<Ticket[]> {
    await this.ensureLoaded();
    return Array.from(this.tickets.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  async addTicket(ticket: Ticket): Promise<void> {
    await this.ensureLoaded();
    this.tickets.set(ticket.id, ticket);
    await this.persistTickets();
  }
  async updateTicket(id: string, updates: Partial<Ticket>): Promise<Ticket | null> {
    await this.ensureLoaded();
    const ticket = this.tickets.get(id);
    if (!ticket) return null;
    const updated = { ...ticket, ...updates };
    this.tickets.set(id, updated);
    await this.persistTickets();
    return updated;
  }
  async deleteTicket(id: string): Promise<boolean> {
    await this.ensureLoaded();
    const deleted = this.tickets.delete(id);
    if (deleted) await this.persistTickets();
    return deleted;
  }
  async getTicket(id: string): Promise<Ticket | null> {
    await this.ensureLoaded();
    return this.tickets.get(id) || null;
  }
  async getSessionCount(): Promise<number> {
    await this.ensureLoaded();
    return this.sessions.size;
  }
}