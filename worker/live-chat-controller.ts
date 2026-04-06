import { DurableObject } from 'cloudflare:workers';
import type { ChatSession, ChatMessage } from './types';
import type { Env } from './core-utils';

/**
 * LiveChatController Durable Object
 * Manages live chat sessions, messages, typing indicators, and SSE streams.
 */
export class LiveChatController extends DurableObject<Env> {
  private chatSessions = new Map<string, ChatSession>();
  private chatMessages = new Map<string, ChatMessage>();
  private sseClients = new Map<string, ReadableStreamDefaultController[]>(); // chatId -> SSE controllers
  private loaded = false;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  private async ensureLoaded(): Promise<void> {
    if (!this.loaded) {
      const storedSessions = await this.ctx.storage.get<Record<string, ChatSession>>('chatSessions') || {};
      const storedMessages = await this.ctx.storage.get<Record<string, ChatMessage>>('chatMessages') || {};
      this.chatSessions = new Map(Object.entries(storedSessions));
      this.chatMessages = new Map(Object.entries(storedMessages));
      this.loaded = true;
    }
  }

  private async persistChatSessions(): Promise<void> {
    await this.ctx.storage.put('chatSessions', Object.fromEntries(this.chatSessions));
  }

  private async persistChatMessages(): Promise<void> {
    await this.ctx.storage.put('chatMessages', Object.fromEntries(this.chatMessages));
  }

  // ─── Chat Session CRUD ───────────────────────────────────

  async createChatSession(data: {
    id?: string;
    customerId: string | null;
    customerName: string;
    customerEmail: string | null;
  }): Promise<ChatSession> {
    await this.ensureLoaded();

    const session: ChatSession = {
      id: data.id || `chat-${crypto.randomUUID()}`,
      customerId: data.customerId,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      agentId: null,
      state: 'collecting',
      aiSummary: null,
      suggestedCategory: null,
      suggestedPriority: null,
      transcript: [],
      typingIndicator: { customer: false, agent: false },
      createdAt: new Date().toISOString(),
      closedAt: null,
      ticketId: null,
      maxConcurrentChats: 2,
    };

    this.chatSessions.set(session.id, session);
    await this.persistChatSessions();
    return session;
  }

  async getChatSession(id: string): Promise<ChatSession | null> {
    await this.ensureLoaded();
    return this.chatSessions.get(id) || null;
  }

  async updateChatSession(id: string, updates: Partial<ChatSession>): Promise<ChatSession | null> {
    await this.ensureLoaded();
    const session = this.chatSessions.get(id);
    if (!session) return null;
    const updated = { ...session, ...updates };
    this.chatSessions.set(id, updated);
    await this.persistChatSessions();
    return updated;
  }

  async deleteChatSession(id: string): Promise<boolean> {
    await this.ensureLoaded();
    return this.chatSessions.delete(id);
  }

  async listChatSessions(filter?: { state?: string; agentId?: string }): Promise<ChatSession[]> {
    await this.ensureLoaded();
    let sessions = Array.from(this.chatSessions.values());
    if (filter?.state) sessions = sessions.filter(s => s.state === filter.state);
    if (filter?.agentId) sessions = sessions.filter(s => s.agentId === filter.agentId);
    return sessions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listWaitingChats(): Promise<ChatSession[]> {
    await this.ensureLoaded();
    return this.chatSessions.values()
      .filter(s => s.state === 'waiting')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  // ─── Chat Messages ──────────────────────────────────────

  async addMessage(msg: ChatMessage): Promise<ChatMessage> {
    await this.ensureLoaded();
    this.chatMessages.set(msg.id, msg);
    await this.persistChatMessages();

    // Broadcast to SSE clients
    const clients = this.sseClients.get(msg.chatId) || [];
    for (const client of clients) {
      try {
        client.write(`data: ${JSON.stringify({ type: 'message', data: msg })}\n\n`);
      } catch { /* client disconnected */ }
    }

    return msg;
  }

  async getMessages(chatId: string): Promise<ChatMessage[]> {
    await this.ensureLoaded();
    return Array.from(this.chatMessages.values())
      .filter(m => m.chatId === chatId)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  // ─── Typing Indicators ──────────────────────────────────

  async setTypingIndicator(chatId: string, sender: 'customer' | 'agent', isTyping: boolean): Promise<void> {
    await this.ensureLoaded();
    const session = this.chatSessions.get(chatId);
    if (!session) return;
    session.typingIndicator[sender] = isTyping;
    this.chatSessions.set(chatId, session);
    await this.persistChatSessions();

    // Broadcast to SSE clients
    const clients = this.sseClients.get(chatId) || [];
    for (const client of clients) {
      try {
        client.write(`data: ${JSON.stringify({ type: 'typing', data: { sender, isTyping } })}\n\n`);
      } catch { /* client disconnected */ }
    }
  }

  // ─── SSE Stream ─────────────────────────────────────────

  async getSSEStream(chatId: string): Promise<ReadableStream> {
    await this.ensureLoaded();

    const stream = new ReadableStream({
      start: (controller) => {
        if (!this.sseClients.has(chatId)) this.sseClients.set(chatId, []);
        this.sseClients.get(chatId)!.push(controller);

        // Send initial heartbeat
        controller.write(`: heartbeat\n\n`);

        // Send existing messages
        const messages = Array.from(this.chatMessages.values())
          .filter(m => m.chatId === chatId)
          .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
        for (const msg of messages) {
          controller.write(`data: ${JSON.stringify({ type: 'message', data: msg })}\n\n`);
        }
      },
      cancel: (controller) => {
        const clients = this.sseClients.get(chatId) || [];
        const idx = clients.indexOf(controller);
        if (idx >= 0) clients.splice(idx, 1);
      },
    });

    // Heartbeat every 15s
    const heartbeat = setInterval(() => {
      const clients = this.sseClients.get(chatId) || [];
      for (const client of clients) {
        try { client.write(`: heartbeat\n\n`); } catch {}
      }
    }, 15000);

    this.ctx.waitUntil(new Promise(() => {})).catch(() => clearInterval(heartbeat));

    return stream;
  }

  // ─── Cleanup ────────────────────────────────────────────

  async cleanupOldChats(olderThanDays: number = 90): Promise<number> {
    await this.ensureLoaded();
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
    let cleaned = 0;

    for (const [id, session] of this.chatSessions) {
      if (session.closedAt && session.closedAt < cutoff) {
        this.chatSessions.delete(id);
        cleaned++;
      }
    }

    // Clean orphaned messages
    const activeChatIds = new Set(this.chatSessions.keys());
    for (const [id, msg] of this.chatMessages) {
      if (!activeChatIds.has(msg.chatId)) {
        this.chatMessages.delete(id);
      }
    }

    await this.persistChatSessions();
    await this.persistChatMessages();
    return cleaned;
  }
}
