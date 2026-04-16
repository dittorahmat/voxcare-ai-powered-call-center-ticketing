## Context

VoxCare is a Cloudflare Workers + React call center ticketing application. The worker uses Hono for routing, Durable Objects (AppController, AuthController, RateLimiter, ChatAgent) for state, R2 for file storage, and SendGrid for email delivery. The frontend is React 18 with Zustand, TanStack Query, and Shadcn/UI.

The `wrangler.jsonc` already has `nodejs_compat`, Durable Objects, and R2 bucket bindings. Analytics endpoints already exist and feed the data needed for reports. `CustomerChatPage.tsx` currently hardcodes `customerName='Customer'`. The embeddable widget exists at `src/widget/chat-widget.ts`.

**Constraints:**
- Cloudflare Workers environment — no persistent filesystem, WASM limitations
- `@react-pdf/renderer` cannot be used on Workers (WASM dependency that breaks)
- Cloudflare Browser Rendering API is the recommended PDF generation path
- Cron Triggers are Cloudflare-native, no separate scheduler needed
- Single-tenant deployment only

**Stakeholders:** Agents (see customer identity in chats), Supervisors (receive reports), Admins (configure cron/reports), Customers (identified in chats)

## Goals

1. **Automate operational tasks**: Auto-close stale tickets, send CSAT surveys, clean up old data, deliver scheduled reports — all without manual intervention
2. **Professional report delivery**: PDF reports that supervisors can download on-demand or receive via email on a schedule
3. **Customer identity in chat**: Agents know who they're talking to; customer chat history is linked to their profile

## Non-Goals

- Real-time push notifications for cron job results (email is sufficient)
- Custom report builder / ad-hoc report creation (Phase 3)
- Customer self-service report access (reports are supervisor/admin only)
- OAuth/Social login for customer chat identity (email-based auth is sufficient)
- Multi-tenant customer identity (single tenant only)

## Decisions

### 1. Cron: Cloudflare Native Triggers vs. Application-Level Scheduler

**Decision:** Use Cloudflare Cron Triggers defined in `wrangler.jsonc` with a `scheduled()` handler in `worker/index.ts`.

**Rationale:**
- Cloudflare manages the schedule — no need to track timers in-application
- Free tier includes cron triggers; no external scheduler (e.g., Vercel Cron, GitHub Actions) needed
- Single `scheduled()` handler multiplexes to individual job functions
- Alternative: `setInterval` in a long-lived DO — unreliable on Workers, wastes resources
- Alternative: External cron hitting an HTTP endpoint — adds dependency, auth complexity

**Cron schedule:**
- Auto-close: `*/30 * * * *` (every 30 minutes)
- CSAT reminders: `0 */6 * * *` (every 6 hours)
- CSAT cleanup: `0 3 * * *` (daily at 3am)
- Scheduled reports: `*/15 * * * *` (every 15 minutes — checks `nextRunAt` per report)

### 2. PDF: Browser Rendering API vs. @react-pdf/renderer

**Decision:** Use Cloudflare Browser Rendering API for server-side PDF generation. Render HTML report templates and POST to the Browser Rendering `/pdf` endpoint.

**Rationale:**
- `@react-pdf/renderer` depends on `pdfkit` which requires WASM that fails on Cloudflare Workers
- Browser Rendering API runs a headless Chromium — renders any HTML/CSS to PDF
- Already available on Cloudflare; just needs a binding or API call
- Alternative: Generate HTML-only reports emailed as inline HTML — less professional, can't print well
- Alternative: Client-side PDF generation — defeats the purpose of scheduled email delivery

**Fallback:** If Browser Rendering API is unavailable or times out, fall back to HTML email with a link to the web-based PDF download.

### 3. Report Data: Direct DO Access vs. Internal HTTP Calls

**Decision:** PDF/HTML reports fetch data directly from the AppController Durable Object (e.g., `controller.listTickets()`) rather than calling internal HTTP endpoints.

**Rationale:**
- Same worker process — no network hop needed
- Avoids auth middleware overhead on internal calls
- Direct access to full data methods (pagination, filtering)
- Alternative: `fetch('http://internal/api/...')` — works on Workers but adds indirection

### 4. Chat Identity: Read from CustomerAuthContext in Frontend

**Decision:** The frontend `CustomerChatPage.tsx` reads customer identity from the existing `CustomerAuthContext` and passes `customerId`, `customerName`, `customerEmail` to `POST /api/chat-sessions`.

**Rationale:**
- `CustomerAuthContext` already exists from the customer portal work
- No new auth infrastructure needed
- Anonymous users (no context) send `null` identity fields — preserves current behavior
- Alternative: Separate widget auth token — unnecessary complexity

### 5. Embeddable Widget: data-* Attributes for Customer Identity

**Decision:** The embeddable widget script tag accepts optional `data-customer-name` and `data-customer-email` attributes. These are read at init time and passed to the chat session creation API.

**Rationale:**
- Simple integration for host websites: `<script data-customer-name="Jane" ...>`
- No cookie/session dependency — works cross-origin
- Optional — anonymous visitors still work
- Alternative: PostMessage API — requires host page cooperation, more complex
- Alternative: JWT in widget config — overkill for identity passthrough

### 6. Customer Chat History: New Endpoint vs. Reuse Existing

**Decision:** Create a new `GET /api/customer/chat-sessions` endpoint scoped to the authenticated customer's `customerId`.

**Rationale:**
- Customer-scoped access only — they see their own chats
- Follows the existing pattern of `/api/customer/tickets`
- Alternative: Reuse agent-facing `/api/chat-sessions` with role filter — would expose agent-side data

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Browser Rendering API cold start / timeout | PDF generation fails for scheduled reports | Fallback to HTML email; retry on next cron cycle |
| Cron handler exceeds 15-minute Worker CPU limit | Jobs not completed | Split heavy jobs (auto-close, reports) into paginated batches; log partial progress |
| Customer identity spoofing via widget data attributes | Fake customer names in chat | Widget identity is informational only; agents verify identity via ticket history; no privilege escalation from name/email |
| Report email delivery failure (SendGrid rate limits, bounces) | Supervisors miss reports | Log failures; don't update `lastRunAt` so retry occurs next cycle; max 3 retries |
| Auto-close rules close tickets incorrectly | Customer dissatisfaction | Rules are configurable and must be explicitly enabled; audit log entries for every auto-close |
| `@react-pdf/renderer` still in package.json causes confusion | Developers try to use it | Add a comment in package.json or README noting it's not used on Workers; or remove it entirely |
