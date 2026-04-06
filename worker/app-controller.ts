import { DurableObject } from 'cloudflare:workers';
import type {
  SessionInfo, Ticket, User, SLAConfig, SLARecord,
  Notification, AgentEntry, SystemSettings,
  Customer, CallRecord, AuditEntry,
  CannedResponse, Holiday, PasswordReset,
  SavedView, TicketRelation, CSATResponse, AutoCloseRule,
  ShiftSchedule, BreakLog, ScheduledReport, EmailTemplate
} from './types';
import type { Env } from './core-utils';
export class AppController extends DurableObject<Env> {
  private sessions = new Map<string, SessionInfo>();
  private tickets = new Map<string, Ticket>();
  private users = new Map<string, User>();
  private slaConfigs = new Map<string, SLAConfig>();
  private slaRecords = new Map<string, SLARecord>();
  private notifications = new Map<string, Notification>();
  private agentQueue = new Map<string, AgentEntry>();
  private settings = new Map<string, unknown>();
  private customers = new Map<string, Customer>();
  private calls = new Map<string, CallRecord>();
  private auditLog: AuditEntry[] = [];
  private cannedResponses = new Map<string, CannedResponse>();
  private holidays = new Map<string, Holiday>();
  private passwordResets = new Map<string, PasswordReset>();
  // New entity maps
  private savedViews = new Map<string, SavedView>();
  private ticketRelations = new Map<string, TicketRelation>();
  private csatResponses = new Map<string, CSATResponse>();
  private autoCloseRules = new Map<string, AutoCloseRule>();
  private shiftSchedules = new Map<string, ShiftSchedule>();
  private breakLogs = new Map<string, BreakLog>();
  private scheduledReports = new Map<string, ScheduledReport>();
  private emailTemplates = new Map<string, EmailTemplate>();
  private loaded = false;
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }
  private async ensureLoaded(): Promise<void> {
    if (!this.loaded) {
      const storedSessions = await this.ctx.storage.get<Record<string, SessionInfo>>('sessions') || {};
      const storedTickets = await this.ctx.storage.get<Record<string, Ticket>>('tickets') || {};
      const storedUsers = await this.ctx.storage.get<Record<string, User>>('users') || {};
      const storedSLAConfigs = await this.ctx.storage.get<Record<string, SLAConfig>>('slaConfigs') || {};
      const storedSLARecords = await this.ctx.storage.get<Record<string, SLARecord>>('slaRecords') || {};
      const storedNotifications = await this.ctx.storage.get<Record<string, Notification>>('notifications') || {};
      const storedAgentQueue = await this.ctx.storage.get<Record<string, AgentEntry>>('agentQueue') || {};
      const storedSettings = await this.ctx.storage.get<Record<string, unknown>>('settings') || {};
      const storedCustomers = await this.ctx.storage.get<Record<string, Customer>>('customers') || {};
      const storedCalls = await this.ctx.storage.get<Record<string, CallRecord>>('calls') || {};
      const storedAuditLog = await this.ctx.storage.get<AuditEntry[]>('auditLog') || [];
      const storedCanned = await this.ctx.storage.get<Record<string, CannedResponse>>('cannedResponses') || {};
      const storedHolidays = await this.ctx.storage.get<Record<string, Holiday>>('holidays') || {};
      const storedResets = await this.ctx.storage.get<Record<string, PasswordReset>>('passwordResets') || {};
      const storedViews = await this.ctx.storage.get<Record<string, SavedView>>('savedViews') || {};
      const storedRelations = await this.ctx.storage.get<Record<string, TicketRelation>>('ticketRelations') || {};
      const storedCSAT = await this.ctx.storage.get<Record<string, CSATResponse>>('csatResponses') || {};
      const storedRules = await this.ctx.storage.get<Record<string, AutoCloseRule>>('autoCloseRules') || {};
      const storedShifts = await this.ctx.storage.get<Record<string, ShiftSchedule>>('shiftSchedules') || {};
      const storedBreaks = await this.ctx.storage.get<Record<string, BreakLog>>('breakLogs') || {};
      const storedScheduledReports = await this.ctx.storage.get<Record<string, ScheduledReport>>('scheduledReports') || {};
      const storedEmailTemplates = await this.ctx.storage.get<Record<string, EmailTemplate>>('emailTemplates') || {};
      this.sessions = new Map(Object.entries(storedSessions));
      this.tickets = new Map(Object.entries(storedTickets));
      this.users = new Map(Object.entries(storedUsers));
      this.slaConfigs = new Map(Object.entries(storedSLAConfigs));
      this.slaRecords = new Map(Object.entries(storedSLARecords));
      this.notifications = new Map(Object.entries(storedNotifications));
      this.agentQueue = new Map(Object.entries(storedAgentQueue));
      this.settings = new Map(Object.entries(storedSettings));
      this.customers = new Map(Object.entries(storedCustomers));
      this.calls = new Map(Object.entries(storedCalls));
      this.auditLog = storedAuditLog;
      this.cannedResponses = new Map(Object.entries(storedCanned));
      this.holidays = new Map(Object.entries(storedHolidays));
      this.passwordResets = new Map(Object.entries(storedResets));
      this.savedViews = new Map(Object.entries(storedViews));
      this.ticketRelations = new Map(Object.entries(storedRelations));
      this.csatResponses = new Map(Object.entries(storedCSAT));
      this.autoCloseRules = new Map(Object.entries(storedRules));
      this.shiftSchedules = new Map(Object.entries(storedShifts));
      this.breakLogs = new Map(Object.entries(storedBreaks));
      this.scheduledReports = new Map(Object.entries(storedScheduledReports));
      this.emailTemplates = new Map(Object.entries(storedEmailTemplates));
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
            transcript: "Agent: Hello, Sarah. How can I help?\nCustomer: My internet has been cutting out all day.",
            assignedTo: null,
            slaRecordId: null,
            escalationLevel: 0,
            resolutionTime: null,
            resolvedAt: null,
            resolvedBy: null,
            customerId: null,
            internalNotes: [],
            publicNotes: null,
            attachments: [],
            tags: [],
            publicToken: null,
            mergedInto: null,
            fcrFlag: false,
            handleTimeSeconds: null,
            updatedAt: null,
            lastCustomerReplyAt: null,
          }
        ];
        mockTickets.forEach(t => this.tickets.set(t.id, t));
        await this.ctx.storage.put('tickets', Object.fromEntries(this.tickets));
      }
      // Migrate existing tickets that lack new fields
      let migratedTickets = false;
      for (const [id, ticket] of this.tickets) {
        if (ticket.assignedTo === undefined) {
          (ticket as any).assignedTo = null;
          (ticket as any).slaRecordId = null;
          (ticket as any).escalationLevel = 0;
          (ticket as any).resolutionTime = null;
          (ticket as any).resolvedAt = null;
          (ticket as any).resolvedBy = null;
          (ticket as any).customerId = null;
          migratedTickets = true;
        }
      }
      if (migratedTickets) {
        await this.persistTickets();
      }
      // Seed default SLA configs
      if (this.slaConfigs.size === 0) {
        const defaultSLAConfigs: SLAConfig[] = [
          { id: 'sla-low', priority: 'low', responseMinutes: 480, resolutionMinutes: 1440, escalationMinutes: 960 },
          { id: 'sla-medium', priority: 'medium', responseMinutes: 240, resolutionMinutes: 720, escalationMinutes: 480 },
          { id: 'sla-high', priority: 'high', responseMinutes: 60, resolutionMinutes: 240, escalationMinutes: 120 },
          { id: 'sla-urgent', priority: 'urgent', responseMinutes: 15, resolutionMinutes: 120, escalationMinutes: 30 },
        ];
        defaultSLAConfigs.forEach(c => this.slaConfigs.set(c.id, c));
        await this.persistSLAConfigs();
      }
      // Create SLA records for existing tickets that don't have them
      for (const [id, ticket] of this.tickets) {
        if (!ticket.slaRecordId) {
          const slaConfig = await this.getSLAConfigByPriority(ticket.priority);
          if (slaConfig) {
            const slaRecord: SLARecord = {
              id: `sla-${id}`,
              ticketId: id,
              responseDeadline: new Date(new Date(ticket.createdAt).getTime() + slaConfig.responseMinutes * 60000).toISOString(),
              resolutionDeadline: new Date(new Date(ticket.createdAt).getTime() + slaConfig.resolutionMinutes * 60000).toISOString(),
              firstResponseAt: null,
              resolvedAt: null,
              escalationLevel: 0,
              breached: false,
              escalationTriggered: false,
              createdAt: ticket.createdAt,
            };
            this.slaRecords.set(slaRecord.id, slaRecord);
            ticket.slaRecordId = slaRecord.id;
            this.tickets.set(id, ticket);
          }
        }
      }
      await this.persistSLARecords();
      await this.persistTickets();
      // Migrate existing SLA records that lack escalationTriggered
      let migratedSLA = false;
      for (const [id, record] of this.slaRecords) {
        if (record.escalationTriggered === undefined) {
          (record as any).escalationTriggered = false;
          migratedSLA = true;
        }
      }
      if (migratedSLA) await this.persistSLARecords();
      // Seed default system settings
      if (this.settings.size === 0) {
        this.settings.set('system', {
          companyName: 'VoxCare Call Center',
          timezone: 'UTC',
          workingHours: { start: '08:00', end: '18:00' },
          ticketCategories: ['Technical Support', 'Billing', 'General Inquiry', 'Complaint'],
          fcrTimeWindowMinutes: 60,
          categorySkillsMap: {
            'Technical Support': ['technical', 'networking'],
            'Billing': ['billing', 'payments'],
            'General Inquiry': [],
            'Complaint': [],
          },
        });
        this.settings.set('aiConfig', {
          defaultModel: 'gemini-2.5-flash',
          temperature: 0.7,
          maxTokens: 1024,
          promptTemplate: 'Extract ticket fields from the following transcript:',
          toolsEnabled: ['weather', 'web_search'],
        });
        this.settings.set('notificationPrefs', {
          emailEnabled: false,
          soundEnabled: true,
          desktopEnabled: false,
        });
        await this.persistSettings();
      }
      // Seed default saved views
      if (this.savedViews.size === 0) {
        const now = new Date().toISOString();
        const defaultViews: SavedView[] = [
          { id: 'view-all-open', userId: 'system', name: 'All Open', filters: { status: 'open' }, sort: { field: 'priority', order: 'desc' }, isDefault: true, createdAt: now },
          { id: 'view-unassigned', userId: 'system', name: 'Unassigned', filters: { assignedTo: null }, sort: { field: 'createdAt', order: 'desc' }, isDefault: true, createdAt: now },
          { id: 'view-sla-breached', userId: 'system', name: 'SLA Breached', filters: { slaBreached: true }, sort: { field: 'priority', order: 'desc' }, isDefault: true, createdAt: now },
          { id: 'view-high-priority', userId: 'system', name: 'High Priority', filters: { priority: ['high', 'urgent'] }, sort: { field: 'createdAt', order: 'desc' }, isDefault: true, createdAt: now },
        ];
        defaultViews.forEach(v => this.savedViews.set(v.id, v));
        await this.persistSavedViews();
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
  private async persistUsers(): Promise<void> {
    await this.ctx.storage.put('users', Object.fromEntries(this.users));
  }
  private async persistSLAConfigs(): Promise<void> {
    await this.ctx.storage.put('slaConfigs', Object.fromEntries(this.slaConfigs));
  }
  private async persistSLARecords(): Promise<void> {
    await this.ctx.storage.put('slaRecords', Object.fromEntries(this.slaRecords));
  }
  private async persistNotifications(): Promise<void> {
    await this.ctx.storage.put('notifications', Object.fromEntries(this.notifications));
  }
  private async persistAgentQueue(): Promise<void> {
    await this.ctx.storage.put('agentQueue', Object.fromEntries(this.agentQueue));
  }
  private async persistSettings(): Promise<void> {
    await this.ctx.storage.put('settings', Object.fromEntries(this.settings));
  }
  private async persistCustomers(): Promise<void> {
    await this.ctx.storage.put('customers', Object.fromEntries(this.customers));
  }
  private async persistCalls(): Promise<void> {
    await this.ctx.storage.put('calls', Object.fromEntries(this.calls));
  }
  private async persistAuditLog(): Promise<void> {
    await this.ctx.storage.put('auditLog', this.auditLog);
  }
  private async persistCannedResponses(): Promise<void> {
    await this.ctx.storage.put('cannedResponses', Object.fromEntries(this.cannedResponses));
  }
  private async persistHolidays(): Promise<void> {
    await this.ctx.storage.put('holidays', Object.fromEntries(this.holidays));
  }
  private async persistPasswordResets(): Promise<void> {
    await this.ctx.storage.put('passwordResets', Object.fromEntries(this.passwordResets));
  }
  private async persistSavedViews(): Promise<void> {
    await this.ctx.storage.put('savedViews', Object.fromEntries(this.savedViews));
  }
  private async persistTicketRelations(): Promise<void> {
    await this.ctx.storage.put('ticketRelations', Object.fromEntries(this.ticketRelations));
  }
  private async persistCSATResponses(): Promise<void> {
    await this.ctx.storage.put('csatResponses', Object.fromEntries(this.csatResponses));
  }
  private async persistAutoCloseRules(): Promise<void> {
    await this.ctx.storage.put('autoCloseRules', Object.fromEntries(this.autoCloseRules));
  }
  private async persistShiftSchedules(): Promise<void> {
    await this.ctx.storage.put('shiftSchedules', Object.fromEntries(this.shiftSchedules));
  }
  private async persistBreakLogs(): Promise<void> {
    await this.ctx.storage.put('breakLogs', Object.fromEntries(this.breakLogs));
  }
  private async persistScheduledReports(): Promise<void> {
    await this.ctx.storage.put('scheduledReports', Object.fromEntries(this.scheduledReports));
  }
  private async persistEmailTemplates(): Promise<void> {
    await this.ctx.storage.put('emailTemplates', Object.fromEntries(this.emailTemplates));
  }
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
  async updateSessionActivity(sessionId: string): Promise<void> {
    await this.ensureLoaded();
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActive = Date.now();
      await this.persistSessions();
    }
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

  // ─── User Methods ──────────────────────────────────────────
  async addUser(user: User): Promise<void> {
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
    return Array.from(this.users.values()).find(u => u.email === email && u.active) || null;
  }
  async listUsers(): Promise<User[]> {
    await this.ensureLoaded();
    return Array.from(this.users.values());
  }
  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    await this.ensureLoaded();
    const user = this.users.get(id);
    if (!user) return null;
    const updated = { ...user, ...updates };
    this.users.set(id, updated);
    await this.persistUsers();
    return updated;
  }
  async deleteUser(id: string): Promise<boolean> {
    await this.ensureLoaded();
    return this.users.delete(id);
  }

  // ─── SLA Config Methods ────────────────────────────────────
  async addSLAConfig(config: SLAConfig): Promise<void> {
    await this.ensureLoaded();
    this.slaConfigs.set(config.id, config);
    await this.persistSLAConfigs();
  }
  async listSLAConfigs(): Promise<SLAConfig[]> {
    await this.ensureLoaded();
    return Array.from(this.slaConfigs.values());
  }
  async getSLAConfig(id: string): Promise<SLAConfig | null> {
    await this.ensureLoaded();
    return this.slaConfigs.get(id) || null;
  }
  async getSLAConfigByPriority(priority: Ticket['priority']): Promise<SLAConfig | null> {
    await this.ensureLoaded();
    return Array.from(this.slaConfigs.values()).find(c => c.priority === priority) || null;
  }
  async updateSLAConfig(id: string, updates: Partial<SLAConfig>): Promise<SLAConfig | null> {
    await this.ensureLoaded();
    const config = this.slaConfigs.get(id);
    if (!config) return null;
    const updated = { ...config, ...updates };
    this.slaConfigs.set(id, updated);
    await this.persistSLAConfigs();
    return updated;
  }
  async deleteSLAConfig(id: string): Promise<boolean> {
    await this.ensureLoaded();
    return this.slaConfigs.delete(id);
  }

  // ─── SLA Record Methods ────────────────────────────────────
  async addSLARecord(record: SLARecord): Promise<void> {
    await this.ensureLoaded();
    this.slaRecords.set(record.id, record);
    await this.persistSLARecords();
  }
  async getSLARecord(ticketId: string): Promise<SLARecord | null> {
    await this.ensureLoaded();
    return Array.from(this.slaRecords.values()).find(r => r.ticketId === ticketId) || null;
  }
  async updateSLARecord(id: string, updates: Partial<SLARecord>): Promise<SLARecord | null> {
    await this.ensureLoaded();
    const record = this.slaRecords.get(id);
    if (!record) return null;
    const updated = { ...record, ...updates };
    this.slaRecords.set(id, updated);
    await this.persistSLARecords();
    return updated;
  }
  async listSLARecords(): Promise<SLARecord[]> {
    await this.ensureLoaded();
    return Array.from(this.slaRecords.values());
  }

  // ─── Notification Methods ──────────────────────────────────
  async addNotification(notification: Notification): Promise<void> {
    await this.ensureLoaded();
    this.notifications.set(notification.id, notification);
    await this.persistNotifications();
  }
  async listNotifications(userId: string): Promise<Notification[]> {
    await this.ensureLoaded();
    return Array.from(this.notifications.values())
      .filter(n => n.recipientId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  async getUnreadCount(userId: string): Promise<number> {
    await this.ensureLoaded();
    return Array.from(this.notifications.values())
      .filter(n => n.recipientId === userId && !n.read).length;
  }
  async markNotificationRead(id: string): Promise<Notification | null> {
    await this.ensureLoaded();
    const notification = this.notifications.get(id);
    if (!notification) return null;
    notification.read = true;
    this.notifications.set(id, notification);
    await this.persistNotifications();
    return notification;
  }
  async deleteNotification(id: string): Promise<boolean> {
    await this.ensureLoaded();
    return this.notifications.delete(id);
  }

  // ─── Agent Queue Methods ───────────────────────────────────
  async updateAgentQueue(entry: AgentEntry): Promise<void> {
    await this.ensureLoaded();
    this.agentQueue.set(entry.userId, entry);
    await this.persistAgentQueue();
  }
  async listAgentQueue(): Promise<AgentEntry[]> {
    await this.ensureLoaded();
    return Array.from(this.agentQueue.values());
  }
  async getAgentEntry(userId: string): Promise<AgentEntry | null> {
    await this.ensureLoaded();
    return this.agentQueue.get(userId) || null;
  }
  async removeAgentFromQueue(userId: string): Promise<boolean> {
    await this.ensureLoaded();
    return this.agentQueue.delete(userId);
  }

  // ─── Settings Methods ──────────────────────────────────────
  async getSetting(key: string): Promise<unknown> {
    await this.ensureLoaded();
    return this.settings.get(key);
  }
  async setSetting(key: string, value: unknown): Promise<void> {
    await this.ensureLoaded();
    this.settings.set(key, value);
    await this.persistSettings();
  }
  async getAllSettings(): Record<string, unknown> {
    await this.ensureLoaded();
    return Object.fromEntries(this.settings);
  }

  // ─── Customer Methods ────────────────────────────────────
  async addCustomer(customer: Customer): Promise<void> {
    await this.ensureLoaded();
    this.customers.set(customer.id, customer);
    await this.persistCustomers();
  }
  async getCustomer(id: string): Promise<Customer | null> {
    await this.ensureLoaded();
    return this.customers.get(id) || null;
  }
  async listCustomers(): Promise<Customer[]> {
    await this.ensureLoaded();
    return Array.from(this.customers.values());
  }
  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | null> {
    await this.ensureLoaded();
    const customer = this.customers.get(id);
    if (!customer) return null;
    const updated = { ...customer, ...updates, updatedAt: new Date().toISOString() };
    this.customers.set(id, updated);
    await this.persistCustomers();
    return updated;
  }
  async deleteCustomer(id: string): Promise<boolean> {
    await this.ensureLoaded();
    return this.customers.delete(id);
  }

  // ─── Call Methods ────────────────────────────────────────
  async addCall(call: CallRecord): Promise<void> {
    await this.ensureLoaded();
    this.calls.set(call.id, call);
    await this.persistCalls();
  }
  async getCall(id: string): Promise<CallRecord | null> {
    await this.ensureLoaded();
    return this.calls.get(id) || null;
  }
  async listCalls(): Promise<CallRecord[]> {
    await this.ensureLoaded();
    return Array.from(this.calls.values());
  }
  async updateCall(id: string, updates: Partial<CallRecord>): Promise<CallRecord | null> {
    await this.ensureLoaded();
    const call = this.calls.get(id);
    if (!call) return null;
    const updated = { ...call, ...updates };
    this.calls.set(id, updated);
    await this.persistCalls();
    return updated;
  }
  async deleteCall(id: string): Promise<boolean> {
    await this.ensureLoaded();
    return this.calls.delete(id);
  }

  // ─── Audit Log Methods ───────────────────────────────────
  async appendAuditLog(entry: Omit<AuditEntry, 'id'>): Promise<void> {
    await this.ensureLoaded();
    this.auditLog.push({ ...entry, id: crypto.randomUUID() });
    // Auto-cleanup: keep last 10K entries
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-10000);
    }
    await this.persistAuditLog();
  }
  async listAuditLog(): Promise<AuditEntry[]> {
    await this.ensureLoaded();
    return [...this.auditLog];
  }

  // ─── Canned Response Methods ───────────────────────────────
  async addCannedResponse(cr: CannedResponse): Promise<void> {
    await this.ensureLoaded();
    this.cannedResponses.set(cr.id, cr);
    await this.persistCannedResponses();
  }
  async listCannedResponses(): Promise<CannedResponse[]> {
    await this.ensureLoaded();
    return Array.from(this.cannedResponses.values());
  }
  async updateCannedResponse(id: string, updates: Partial<CannedResponse>): Promise<CannedResponse | null> {
    await this.ensureLoaded();
    const cr = this.cannedResponses.get(id);
    if (!cr) return null;
    const updated = { ...cr, ...updates, updatedAt: new Date().toISOString() };
    this.cannedResponses.set(id, updated);
    await this.persistCannedResponses();
    return updated;
  }
  async deleteCannedResponse(id: string): Promise<boolean> {
    await this.ensureLoaded();
    return this.cannedResponses.delete(id);
  }

  // ─── Holiday Methods ───────────────────────────────────────
  async addHoliday(h: Holiday): Promise<void> {
    await this.ensureLoaded();
    this.holidays.set(h.id, h);
    await this.persistHolidays();
  }
  async listHolidays(): Promise<Holiday[]> {
    await this.ensureLoaded();
    return Array.from(this.holidays.values()).sort((a, b) => a.date.localeCompare(b.date));
  }
  async deleteHoliday(id: string): Promise<boolean> {
    await this.ensureLoaded();
    return this.holidays.delete(id);
  }

  // ─── Password Reset Methods ────────────────────────────────
  async addPasswordReset(pr: PasswordReset): Promise<void> {
    await this.ensureLoaded();
    this.passwordResets.set(pr.token, pr);
    await this.persistPasswordResets();
  }
  async getPasswordReset(token: string): Promise<PasswordReset | null> {
    await this.ensureLoaded();
    const pr = this.passwordResets.get(token);
    if (!pr) return null;
    if (Date.now() > pr.expiresAt) {
      this.passwordResets.delete(token);
      await this.persistPasswordResets();
      return null;
    }
    return pr;
  }
  async deletePasswordReset(token: string): Promise<boolean> {
    await this.ensureLoaded();
    return this.passwordResets.delete(token);
  }
  async cleanupExpiredResets(): Promise<void> {
    await this.ensureLoaded();
    const now = Date.now();
    for (const [token, pr] of this.passwordResets) {
      if (now > pr.expiresAt) this.passwordResets.delete(token);
    }
    await this.persistPasswordResets();
  }

  // ─── Saved Views Methods ───────────────────────────────────
  async addSavedView(view: SavedView): Promise<void> {
    await this.ensureLoaded();
    this.savedViews.set(view.id, view);
    await this.persistSavedViews();
  }
  async getSavedView(id: string): Promise<SavedView | null> {
    await this.ensureLoaded();
    return this.savedViews.get(id) || null;
  }
  async listSavedViews(userId: string): Promise<SavedView[]> {
    await this.ensureLoaded();
    return Array.from(this.savedViews.values()).filter(v => v.userId === userId || v.isDefault);
  }
  async updateSavedView(id: string, updates: Partial<SavedView>): Promise<SavedView | null> {
    await this.ensureLoaded();
    const view = this.savedViews.get(id);
    if (!view) return null;
    const updated = { ...view, ...updates };
    this.savedViews.set(id, updated);
    await this.persistSavedViews();
    return updated;
  }
  async deleteSavedView(id: string): Promise<boolean> {
    await this.ensureLoaded();
    return this.savedViews.delete(id);
  }

  // ─── Ticket Relations Methods ──────────────────────────────
  async addTicketRelation(rel: TicketRelation): Promise<void> {
    await this.ensureLoaded();
    this.ticketRelations.set(rel.id, rel);
    await this.persistTicketRelations();
  }
  async getTicketRelations(ticketId: string): Promise<TicketRelation[]> {
    await this.ensureLoaded();
    return Array.from(this.ticketRelations.values()).filter(r => r.ticketA === ticketId || r.ticketB === ticketId);
  }
  async deleteTicketRelation(id: string): Promise<boolean> {
    await this.ensureLoaded();
    return this.ticketRelations.delete(id);
  }

  // ─── CSAT Methods ──────────────────────────────────────────
  async addCSATResponse(resp: CSATResponse): Promise<void> {
    await this.ensureLoaded();
    this.csatResponses.set(resp.id, resp);
    await this.persistCSATResponses();
  }
  async getCSATResponse(ticketId: string): Promise<CSATResponse | null> {
    await this.ensureLoaded();
    return Array.from(this.csatResponses.values()).find(r => r.ticketId === ticketId) || null;
  }
  async listCSATResponses(): Promise<CSATResponse[]> {
    await this.ensureLoaded();
    return Array.from(this.csatResponses.values()).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }
  async getCSATStats(fromDate?: string, toDate?: string): Promise<{ avgRating: number; responseRate: number; totalResponses: number }> {
    await this.ensureLoaded();
    let responses = Array.from(this.csatResponses.values());
    if (fromDate) responses = responses.filter(r => r.submittedAt >= fromDate);
    if (toDate) responses = responses.filter(r => r.submittedAt <= toDate);
    const total = responses.length;
    const avgRating = total > 0 ? responses.reduce((s, r) => s + r.rating, 0) / total : 0;
    return { avgRating: Math.round(avgRating * 100) / 100, responseRate: 0, totalResponses: total };
  }

  // ─── Auto-Close Rules Methods ──────────────────────────────
  async addAutoCloseRule(rule: AutoCloseRule): Promise<void> {
    await this.ensureLoaded();
    this.autoCloseRules.set(rule.id, rule);
    await this.persistAutoCloseRules();
  }
  async listAutoCloseRules(): Promise<AutoCloseRule[]> {
    await this.ensureLoaded();
    return Array.from(this.autoCloseRules.values());
  }
  async updateAutoCloseRule(id: string, updates: Partial<AutoCloseRule>): Promise<AutoCloseRule | null> {
    await this.ensureLoaded();
    const rule = this.autoCloseRules.get(id);
    if (!rule) return null;
    const updated = { ...rule, ...updates };
    this.autoCloseRules.set(id, updated);
    await this.persistAutoCloseRules();
    return updated;
  }
  async deleteAutoCloseRule(id: string): Promise<boolean> {
    await this.ensureLoaded();
    return this.autoCloseRules.delete(id);
  }

  // ─── Shift Schedule Methods ────────────────────────────────
  async addShiftSchedule(schedule: ShiftSchedule): Promise<void> {
    await this.ensureLoaded();
    this.shiftSchedules.set(schedule.id, schedule);
    await this.persistShiftSchedules();
  }
  async getShiftSchedule(id: string): Promise<ShiftSchedule | null> {
    await this.ensureLoaded();
    return this.shiftSchedules.get(id) || null;
  }
  async getShiftScheduleByWeek(year: number, weekNumber: number): Promise<ShiftSchedule | null> {
    await this.ensureLoaded();
    return Array.from(this.shiftSchedules.values()).find(s => s.year === year && s.weekNumber === weekNumber) || null;
  }
  async listShiftSchedules(): Promise<ShiftSchedule[]> {
    await this.ensureLoaded();
    return Array.from(this.shiftSchedules.values()).sort((a, b) => (a.year * 100 + a.weekNumber) - (b.year * 100 + b.weekNumber));
  }
  async updateShiftSchedule(id: string, updates: Partial<ShiftSchedule>): Promise<ShiftSchedule | null> {
    await this.ensureLoaded();
    const schedule = this.shiftSchedules.get(id);
    if (!schedule) return null;
    const updated = { ...schedule, ...updates };
    this.shiftSchedules.set(id, updated);
    await this.persistShiftSchedules();
    return updated;
  }
  async deleteShiftSchedule(id: string): Promise<boolean> {
    await this.ensureLoaded();
    return this.shiftSchedules.delete(id);
  }

  // ─── Break Log Methods ─────────────────────────────────────
  async addBreakLog(log: BreakLog): Promise<void> {
    await this.ensureLoaded();
    this.breakLogs.set(log.id, log);
    await this.persistBreakLogs();
  }
  async listBreakLogs(userId?: string): Promise<BreakLog[]> {
    await this.ensureLoaded();
    let logs = Array.from(this.breakLogs.values()).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    if (userId) logs = logs.filter(l => l.userId === userId);
    return logs;
  }
  async getActiveBreak(userId: string): Promise<BreakLog | null> {
    await this.ensureLoaded();
    return Array.from(this.breakLogs.values()).find(l => l.userId === userId && !l.endedAt) || null;
  }
  async updateBreakLog(id: string, updates: Partial<BreakLog>): Promise<BreakLog | null> {
    await this.ensureLoaded();
    const log = this.breakLogs.get(id);
    if (!log) return null;
    const updated = { ...log, ...updates };
    this.breakLogs.set(id, updated);
    await this.persistBreakLogs();
    return updated;
  }

  // ─── Scheduled Report Methods ──────────────────────────────
  async addScheduledReport(report: ScheduledReport): Promise<void> {
    await this.ensureLoaded();
    this.scheduledReports.set(report.id, report);
    await this.persistScheduledReports();
  }
  async listScheduledReports(): Promise<ScheduledReport[]> {
    await this.ensureLoaded();
    return Array.from(this.scheduledReports.values());
  }
  async updateScheduledReport(id: string, updates: Partial<ScheduledReport>): Promise<ScheduledReport | null> {
    await this.ensureLoaded();
    const report = this.scheduledReports.get(id);
    if (!report) return null;
    const updated = { ...report, ...updates };
    this.scheduledReports.set(id, updated);
    await this.persistScheduledReports();
    return updated;
  }
  async deleteScheduledReport(id: string): Promise<boolean> {
    await this.ensureLoaded();
    return this.scheduledReports.delete(id);
  }

  // ─── Email Template Methods ────────────────────────────────
  async addEmailTemplate(template: EmailTemplate): Promise<void> {
    await this.ensureLoaded();
    this.emailTemplates.set(template.id, template);
    await this.persistEmailTemplates();
  }
  async getEmailTemplate(name: string): Promise<EmailTemplate | null> {
    await this.ensureLoaded();
    return Array.from(this.emailTemplates.values()).find(t => t.name === name) || null;
  }
  async listEmailTemplates(): Promise<EmailTemplate[]> {
    await this.ensureLoaded();
    return Array.from(this.emailTemplates.values());
  }
  async updateEmailTemplate(id: string, updates: Partial<EmailTemplate>): Promise<EmailTemplate | null> {
    await this.ensureLoaded();
    const template = this.emailTemplates.get(id);
    if (!template) return null;
    const updated = { ...template, ...updates, updatedAt: new Date().toISOString() };
    this.emailTemplates.set(id, updated);
    await this.persistEmailTemplates();
    return updated;
  }
  async deleteEmailTemplate(id: string): Promise<boolean> {
    await this.ensureLoaded();
    return this.emailTemplates.delete(id);
  }
}