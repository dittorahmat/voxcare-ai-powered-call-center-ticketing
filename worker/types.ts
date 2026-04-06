export interface ApiResponse<T = unknown> { success: boolean; data?: T; error?: string; }
export interface WeatherResult {
  location: string;
  temperature: number;
  condition: string;
  humidity: number;
}
export interface MCPResult {
  content: string;
}
export interface ErrorResult {
  error: string;
}
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'in-progress' | 'resolved' | 'reopened' | 'closed' | 'merged';

// ─── User & Auth ───────────────────────────────────────────────
export type UserRole = 'agent' | 'supervisor' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  passwordSalt: string;
  availability: 'available' | 'busy' | 'break' | 'lunch' | 'offline';
  skills: string[];
  lastAssignedAt: string | null;
  totpSecret: string | null;
  is2faEnabled: boolean;
  notificationPrefs: {
    soundEnabled: boolean;
    desktopEnabled: boolean;
    emailEnabled: boolean;
    eventToggles: Record<string, boolean>;
  };
  active: boolean;
  createdAt: string;
}

export interface AuthTokenPayload {
  sub: string;
  role: UserRole;
  name: string;
  iat: number;
  exp: number;
}

export interface AuthSession {
  userId: string;
  refreshToken: string;
  refreshTokenExpiry: number;
  createdAt: number;
  revoked: boolean;
}

// ─── SLA ───────────────────────────────────────────────────────
export interface SLAConfig {
  id: string;
  priority: TicketPriority;
  responseMinutes: number;
  resolutionMinutes: number;
  escalationMinutes: number;
}

export interface SLARecord {
  id: string;
  ticketId: string;
  responseDeadline: string;
  resolutionDeadline: string;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  escalationLevel: number;
  breached: boolean;
  escalationTriggered: boolean;
  createdAt: string;
}

// ─── Notifications ─────────────────────────────────────────────
export type NotificationType =
  | 'ticket-created'
  | 'ticket-updated'
  | 'sla-warning'
  | 'sla-breached'
  | 'call-assigned'
  | 'call-incoming'
  | 'agent-status'
  | 'escalation'
  | 'system-alert';

export interface Notification {
  id: string;
  type: NotificationType;
  recipientId: string;
  read: boolean;
  createdAt: string;
  expiresAt: string;
  data: Record<string, unknown>;
}

// ─── Agent Queue ───────────────────────────────────────────────
export interface AgentEntry {
  userId: string;
  name: string;
  availability: 'available' | 'busy' | 'offline';
  activeTicketCount: number;
  lastActivityAt: string;
  skills: string[];
}

// ─── Telephony ─────────────────────────────────────────────────
export type TelephonyEventType =
  | 'CHANNEL_CREATE'
  | 'CHANNEL_ANSWER'
  | 'CHANNEL_HANGUP'
  | 'DTMF'
  | 'CUSTOM::call_queue'
  | 'HEARTBEAT';

export interface TelephonyEvent {
  type: TelephonyEventType;
  timestamp: string;
  data: Record<string, unknown>;
  callId?: string;
  agentId?: string;
}

export interface CallRecord {
  id: string;
  callId: string;
  callerNumber: string | null;
  agentId: string | null;
  ticketId: string | null;
  customerId: string | null;
  status: 'ringing' | 'active' | 'hold' | 'ended';
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  transcript: string | null;
  outcome: string | null;
}

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  tags: string[];
  isVip: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  ticketCount: number;
}

export interface AuditEntry {
  id: string;
  action: string;
  userId: string;
  userName: string;
  userRole: string;
  entityType: string;
  entityId: string;
  timestamp: string;
  changes?: Record<string, { before: unknown; after: unknown }>;
  ipAddress?: string;
}

export interface CannedResponse {
  id: string;
  name: string;
  body: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  createdAt: string;
}

export interface PasswordReset {
  token: string;
  userId: string;
  expiresAt: number; // timestamp
  createdAt: string;
}

// ─── Settings ──────────────────────────────────────────────────
export interface SystemSettings {
  companyName: string;
  timezone: string;
  workingHours: { start: string; end: string };
  ticketCategories: string[];
  slaRules: SLAConfig[];
  aiConfig: {
    defaultModel: string;
    temperature: number;
    maxTokens: number;
    promptTemplate: string;
    toolsEnabled: string[];
  };
  notificationPrefs: {
    emailEnabled: boolean;
    soundEnabled: boolean;
    desktopEnabled: boolean;
  };
}

// ─── Extended Ticket ───────────────────────────────────────────
export interface TicketAttachment {
  key: string;
  filename: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}

export interface InternalNote {
  text: string;
  authorId: string;
  authorName: string;
  timestamp: string;
}

export interface PublicNote {
  text: string;
  authorId: string;
  authorName: string;
  timestamp: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  customerName: string;
  priority: TicketPriority;
  status: TicketStatus;
  category: string;
  createdAt: string;
  transcript?: string;
  // New fields
  assignedTo: string | null;
  slaRecordId: string | null;
  escalationLevel: number;
  resolutionTime: number | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  customerId: string | null;
  // Internal vs Public notes
  internalNotes: InternalNote[];
  publicNotes: PublicNote | null;
  // File attachments
  attachments: TicketAttachment[];
  // Tags
  tags: string[];
  // Public view token
  publicToken: string | null;
  // Merge support
  mergedInto: string | null;
  // FCR tracking
  fcrFlag: boolean;
  // AHT tracking
  handleTimeSeconds: number | null;
  // Updated at for auto-close rules
  updatedAt: string | null;
  // Last customer reply date (for auto-close)
  lastCustomerReplyAt: string | null;
}
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  id: string;
  toolCalls?: ToolCall[];
}
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
}
export interface ChatState {
  messages: Message[];
  sessionId: string;
  isProcessing: boolean;
  model: string;
  streamingMessage?: string;
}
export interface SessionInfo {
  id: string;
  title: string;
  createdAt: number;
  lastActive: number;
}
export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
}

// ─── Saved Views ───────────────────────────────────────────────
export interface SavedView {
  id: string;
  userId: string;
  name: string;
  filters: Record<string, unknown>;
  sort: { field: string; order: 'asc' | 'desc' } | null;
  isDefault: boolean;
  createdAt: string;
}

// ─── Ticket Relations ──────────────────────────────────────────
export interface TicketRelation {
  id: string;
  ticketA: string;
  ticketB: string;
  type: 'parent-child' | 'related';
  createdAt: string;
}

// ─── CSAT ──────────────────────────────────────────────────────
export interface CSATResponse {
  id: string;
  ticketId: string;
  rating: number; // 1-5
  comment: string | null;
  submittedAt: string;
  customerEmail: string;
}

// ─── Auto-Close Rules ──────────────────────────────────────────
export interface AutoCloseRule {
  id: string;
  name: string;
  condition: {
    status?: string;
    daysSinceUpdate?: number;
    daysSinceCustomerReply?: number;
  };
  action: {
    setStatus: string;
    addInternalNote?: string;
  };
  enabled: boolean;
  createdAt: string;
}

// ─── Shift Scheduling ──────────────────────────────────────────
export interface ShiftEntry {
  day: number; // 0=Sunday, 6=Saturday
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  agentIds: string[];
}

export interface ShiftSchedule {
  id: string;
  weekNumber: number; // ISO week number
  year: number;
  entries: ShiftEntry[];
}

// ─── Break Management ──────────────────────────────────────────
export interface BreakLog {
  id: string;
  userId: string;
  reason: string; // lunch, personal, training, other
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
}

// ─── Scheduled Reports ─────────────────────────────────────────
export interface ScheduledReport {
  id: string;
  type: 'daily-summary' | 'weekly-sla' | 'weekly-agent-performance';
  schedule: {
    frequency: 'daily' | 'weekly';
    time: string; // HH:MM
    dayOfWeek?: number; // 0-6, for weekly
  };
  recipients: string[]; // user IDs or emails
  dateRange: 'yesterday' | 'last-7-days' | 'last-30-days';
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
}

// ─── Email Templates ───────────────────────────────────────────
export interface EmailTemplate {
  id: string;
  name: string; // ticket-created, ticket-updated, ticket-resolved
  subject: string;
  htmlBody: string;
  textBody: string;
  updatedAt: string;
}