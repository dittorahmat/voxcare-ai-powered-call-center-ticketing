## Context

VoxCare is a full-stack call center ticketing application built on Cloudflare Workers (Hono) + React (Vite). It currently has:
- Ticket CRUD via `AppController` Durable Object (persistent storage)
- AI chat sessions via `ChatAgent` Durable Object
- Browser-based voice recording (Web Speech API) with AI ticket extraction
- A dashboard with basic stats and a donut chart
- Hardcoded "Jane Doe" identity — no authentication
- No real telephony, no notifications, no SLA, no settings, no analytics

The codebase uses a clean separation: `worker/` for backend, `src/` for frontend, with Cloudflare Durable Objects for persistence.

**Constraints:**
- Must stay on Cloudflare Workers + Durable Objects architecture
- FreeSWITCH integration is an abstract interface — actual PBX deployment is out of scope
- No breaking changes to existing ticket data model without migration path
- Frontend uses shadcn/ui, Zustand, TanStack Query, React Router

## Goals / Non-Goals

**Goals:**
- Production-grade authentication with role-based access control
- Abstract telephony integration layer for FreeSWITCH (ESL events, call routing, audio streaming)
- Real-time notifications via SSE to all connected clients
- Configurable SLA rules with automatic escalation
- Agent assignment with round-robin and skill-based routing
- Complete settings UI for system, user, and AI configuration
- Analytics dashboard with exportable reports

**Non-Goals:**
- Actual FreeSWITCH deployment or VPS configuration
- Twilio, Vonage, or other hosted telephony integrations
- WebRTC softphone implementation (phase 2)
- Multi-tenant / multi-organization support
- Mobile app development
- AI model training or fine-tuning

## Decisions

### 1. Authentication: JWT with Cloudflare Durable Object Session Store

**Decision:** Use `@hono/jwt` for token generation/verification. Store session metadata in a new `AuthController` Durable Object. Tokens are short-lived (1h access + 7d refresh).

**Rationale:**
- JWT is stateless for API calls, reducing DO read overhead
- Durable Object session store enables server-side revocation and concurrent session limits
- `@hono/jwt` is the official Hono integration — minimal overhead
- Alternative: Cloudflare Access / Zero Trust — too heavyweight for self-hosted app
- Alternative: Cookie-based sessions — harder with Workers' edge architecture

**Token Structure:**
```
{
  "sub": "<userId>",
  "role": "agent" | "supervisor" | "admin",
  "name": "<displayName>",
  "iat": <timestamp>,
  "exp": <timestamp>
}
```

### 2. Auth Flow: Email + Password with PBKDF2

**Decision:** Simple email/password authentication. Passwords hashed with PBKDF2 (via Web Crypto API, natively available in Workers). No OAuth in v1.

**Rationale:**
- Call center agents are managed users — no social login needed
- Web Crypto API has native PBKDF2 support in Workers — no dependencies
- Alternative: bcrypt — not natively available in Workers, requires WASM
- OAuth/SSO can be added later via `worker/userRoutes.ts` extension

### 3. FreeSWITCH Integration: Webhook-Driven ESL Bridge

**Decision:** Create an abstract `TelephonyBridge` module in worker that:
- Receives ESL events from FreeSWITCH via HTTP POST webhooks
- Exposes a REST API for Workers to send commands back to FreeSWITCH (originate call, hangup, transfer)
- Provides an audio streaming endpoint for real-time transcription

**Architecture:**
```
FreeSWITCH ──ESL Events──▶ Cloudflare Workers (POST /api/telephony/events)
                                                        │
FreeSWITCH ◄──REST Cmds───│ Workers API (POST /api/telephony/commands)
                                                        │
                                           Audio Stream │ (WebSocket / chunked)
                                                        ▼
                                                 AI Transcription
```

**Rationale:**
- HTTP webhooks are the simplest way to get ESL events into Workers
- Workers can't directly connect to ESL (TCP), so a thin bridge service on the FreeSWITCH side is needed
- Audio streaming via chunked POST or WebSocket — Workers support both
- Alternative: Event Socket outbound → external bridge → Workers pub/sub — too complex for v1

### 4. Real-Time Notifications: Server-Sent Events (SSE)

**Decision:** Use SSE (not WebSocket) for notifications. Single `/api/notifications/stream` endpoint that keeps a long-lived connection and pushes JSON events.

**Rationale:**
- SSE is simpler, auto-reconnects, works over HTTP/1.1
- Workers support streaming responses natively
- Notifications are one-directional (server → client) — SSE is sufficient
- Alternative: WebSocket — overkill, more complex connection management
- Alternative: Polling — wasteful, poor UX

**Event Types:**
```
event: ticket-created     → { ticketId, title, priority }
event: sla-warning        → { ticketId, remainingMinutes }
event: sla-breached       → { ticketId, breachedRule }
event: call-assigned      → { callId, callerInfo }
event: agent-status       → { agentId, status: "available"|"busy"|"offline" }
event: escalation         → { ticketId, fromLevel, toLevel }
```

### 5. SLA Engine: Timer-Based with Periodic Evaluation

**Decision:** SLA rules stored in Durable Object. Each ticket gets an `SLARecord` on creation with `responseDeadline` and `resolutionDeadline` computed from rules. A background evaluator (triggered by request or cron) checks for breaches.

**Data Model:**
```
SLAConfig: {
  priority: TicketPriority
  responseMinutes: number      // e.g., 30 for urgent
  resolutionMinutes: number    // e.g., 240 for urgent
  escalationMinutes: number    // e.g., 60 for urgent
}

SLARecord: {
  ticketId: string
  responseDeadline: string     // ISO timestamp
  resolutionDeadline: string
  firstResponseAt?: string
  resolvedAt?: string
  escalationLevel: number
  breached: boolean
}
```

**Rationale:**
- Computing deadlines upfront avoids repeated rule lookups
- Background evaluation (on each ticket fetch or periodic) is simpler than timer-based Workers
- Alternative: Cloudflare Queues + Cron Triggers — adds infrastructure complexity

### 6. Agent Routing: Round-Robin with Availability Flag

**Decision:** Maintain an `AgentQueue` in Durable Object. Each agent has an `available` status. Round-robin picks the next available agent. Skill-based routing uses ticket `category` matching agent `skills`.

**Algorithm:**
```
1. Filter agents where available === true
2. If skill-based: filter by matching category
3. Pick agent with oldest lastAssignedAt (round-robin fairness)
4. Update lastAssignedAt, set available = false (until manually reset)
```

**Rationale:**
- Durable Object ensures atomic assignment — no race conditions
- Simple round-robin is sufficient for v1; weighted/skill-based can follow
- Alternative: External queue service — unnecessary, DO handles this

### 7. Data Model: Extend AppController with New Entity Maps

**Decision:** Add new Map-based stores to `AppController` rather than creating separate Durable Objects for each entity. This keeps data collocated and simplifies queries.

```
AppController stores:
  ├── tickets: Map<string, Ticket>         // existing
  ├── sessions: Map<string, SessionInfo>   // existing
  ├── users: Map<string, User>             // NEW
  ├── slaConfigs: Map<string, SLAConfig>   // NEW
  ├── slaRecords: Map<string, SLARecord>   // NEW
  ├── notifications: Map<string, Notification> // NEW
  ├── agentQueue: Map<string, AgentEntry>  // NEW
  └── settings: Map<string, unknown>       // NEW
```

**Rationale:**
- Single DO simplifies transactional operations (e.g., assign ticket + update agent queue atomically)
- Cloudflare DO storage is SQLite-backed — scales well for call center scale (<100K records)
- Alternative: Separate DOs per entity — over-engineering for this scale

### 8. Settings: JSON Blob Storage with Typed Validation

**Decision:** Store settings as a typed JSON blob in Durable Object. Frontend sends full settings object; backend validates against Zod schema before persisting.

**Settings Structure:**
```
{
  system: { companyName, timezone, workingHours }
  ticketCategories: string[]
  slaRules: SLAConfig[]
  aiConfig: { defaultModel, temperature, maxTokens, promptTemplate }
  notificationPrefs: { emailEnabled, soundEnabled, desktopEnabled }
}
```

**Rationale:**
- Simple, flexible, no schema migrations needed
- Zod validation ensures type safety
- Alternative: Normalized settings tables — over-engineering for <50 config values

### 9. Analytics: Computed on Demand from Durable Object Data

**Decision:** Compute analytics metrics on-demand from Durable Object data. No separate analytics store. Pre-compute common aggregations (daily counts, average resolution time) and cache in memory.

**Metrics:**
```
- ticketsByStatus()
- ticketsByPriority()
- ticketsByCategory()
- averageResolutionTime()
- ticketsPerDay(dateRange)
- agentPerformance(agentId)
- slaComplianceRate()
```

**Rationale:**
- Call center scale is small enough for in-memory computation
- DO storage is fast (SQLite) — no need for separate analytics DB
- Alternative: Time-series DB (InfluxDB) — overkill for v1
- Alternative: Cloudflare Analytics Engine — adds cost and complexity

### 10. Frontend Routing: Protected Routes with Role Guards

**Decision:** Create a `<ProtectedRoute>` wrapper that checks auth state. Create a `<RoleGuard>` wrapper that checks user role before rendering children.

```
<ProtectedRoute>
  <RoleGuard requiredRole="supervisor">
    <AnalyticsDashboard />
  </RoleGuard>
</ProtectedRoute>
```

**Role Access Matrix:**
```
                  Agent   Supervisor   Admin
────────────────────────────────────────────
View Tickets        ✅         ✅         ✅
Create Ticket       ✅         ✅         ✅
Resolve Ticket      ✅         ✅         ✅
Assign Ticket       ❌         ✅         ✅
View Analytics      ❌         ✅         ✅
Manage SLA Rules    ❌         ❌         ✅
Manage Users        ❌         ❌         ✅
System Settings     ❌         ❌         ✅
```

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| JWT secret stored in `wrangler.jsonc` plaintext | Secrets leak in repo | Use `wrangler secret put` for production; document in README |
| Durable Object becomes single point of failure | All data lost if DO fails | Cloudflare DOs are replicated; add backup export for critical data |
| SSE connections consume Worker resources | Connection limits under load | Implement connection limits per user; fallback to polling |
| SLA evaluation is request-driven, not time-driven | Breaches detected with delay | Document "evaluated on access" behavior; add cron trigger as phase 2 |
| FreeSWITCH bridge is abstract — no real integration tested | Telephony features may not work as designed | Build the ESL bridge as a separate phase; this change provides the interface only |
| Adding 7 new entity maps to AppController | DO storage grows, potential slowdown | Monitor storage size; implement pagination for list endpoints |
| No migration path for existing mock data | T-1001 mock ticket has no SLA, no assignee | Seed default SLA configs and assign mock ticket on first auth-enabled startup |
| Password storage in Workers | Web Crypto PBKDF2 is secure but not audited | Use industry-standard parameters (100K iterations, 256-bit key); document as v1 — consider Argon2 in v2 |
| Role checks in frontend only | Security bypass possible | Enforce role checks on all backend API endpoints |
