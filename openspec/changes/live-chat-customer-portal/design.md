## Context

VoxCare is a Cloudflare Workers + React call center ticketing application with a complete backend (Hono, Durable Objects, SendGrid, R2) and frontend (React 18, Zustand, TanStack Query, Shadcn/UI). The current auth system uses PBKDF2 password hashing, JWT access tokens (1h expiry), refresh tokens (7d expiry), and 2FA TOTP — all built for internal users (agent/supervisor/admin). Customers exist as CRM records only, with no authentication capability.

The current chat system is an internal AI assistant using Cloudflare Agents SDK with Durable Objects — it's designed for agent use, not customer-facing communication. Notifications already use SSE (`GET /api/notifications/stream`), providing a proven pattern for server-to-client streaming on Cloudflare Workers.

**Constraints:**
- Cloudflare Workers environment (no persistent WebSocket support without special config)
- Durable Objects for state persistence
- SendGrid for email delivery
- Single-tenant only
- Existing `Customer` type has no auth fields
- Existing `UserRole` does not include `'customer'`

**Stakeholders:** Customers (external, unauthenticated initially), Agents (handle chats), Supervisors (monitor), Admins (configure)

## Goals / Non-Goals

**Goals:**
- Customer self-registration with email verification
- Customer portal with ticket viewing, submission, and profile management
- Hybrid live chat: AI greeting → info collection → human agent handoff
- Embeddable chat widget for external websites
- Real-time chat within customer portal
- Auto-creation of tickets from chat transcripts
- Agent chat queue with AI-generated summaries

**Non-Goals:**
- FreeSWITCH telephony integration (separate future phase)
- WhatsApp / SMS / social media channels
- Video calling
- Multi-tenant / multi-organization support
- Omnichannel routing (chat → email → phone handoff)
- Predictive dialer
- Customer community / forum features
- Knowledge base / FAQ system (separate future enhancement)

## Decisions

### 1. Customer Auth: Extend Existing AuthController vs. New CustomerAuthController

**Decision:** Create a new `CustomerAuthController` Durable Object, separate from the existing `AuthController`.

**Rationale:**
- Customer auth has different requirements: email verification, longer token expiry (24h vs 1h), no 2FA needed, no role escalation
- Keeps customer and internal user auth code isolated — easier to maintain and audit
- Same PBKDF2 hashing, same JWT structure — no new cryptographic primitives needed
- Alternative: Extend `AuthController` with a `isCustomer` flag — would make auth controller more complex and harder to reason about

**Shared infrastructure:** Both controllers use the same JWT key, same refresh token pattern, same SendGrid integration for email.

### 2. Customer Role in UserRole: Extend Enum vs. Separate Token Type

**Decision:** Add `'customer'` to `UserRole` type, making it `'agent' | 'supervisor' | 'admin' | 'customer'`. Use the same JWT structure.

**Rationale:**
- Simpler middleware — existing `authMiddleware()` already validates JWT, just needs to accept `'customer'` as a valid role
- Customer JWT can use the same `AuthTokenPayload` structure: `{ sub, role, name, iat, exp }`
- Alternative: Separate customer token type with different payload — adds complexity for minimal security benefit (customer endpoints are scoped by customerId anyway)

**Security implication:** `requireRole()` middleware calls that check for `agent`, `supervisor`, `admin` need to explicitly NOT include `customer`. Any role-exhaustive switches will need updating.

### 3. Customer Email Verification: Token in URL vs. Magic Link

**Decision:** Token in verification URL (`/customer/verify/:token`). User clicks link, token is validated, account is activated, redirect to login page.

**Rationale:**
- Simpler than magic link login — verification only activates the account, user still needs to log in with password
- Token stored in `Customer` record as `verificationToken` with `verificationTokenExpiry`
- 24-hour expiry on verification token
- Alternative: Magic link login — conflates verification with login, less secure

### 4. Live Chat: SSE vs. WebSocket

**Decision:** Use SSE (Server-Sent Events) for the chat message delivery, consistent with the existing notification stream pattern.

**Rationale:**
- Cloudflare Workers support SSE natively via `ReadableStream`
- VoxCare already has a working SSE implementation (`GET /api/notifications/stream`)
- Chat messages flow server → client naturally via SSE
- Client → server messages use regular `POST /api/chat/:sessionId/messages`
- Alternative: WebSocket — requires Cloudflare's `WebSocketPair` API, more complex connection management, harder to test
- Alternative: Long-polling — wasteful, poor UX

**Trade-off:** SSE is unidirectional (server → client). We need two channels:
1. SSE stream for incoming messages (agent/customer receives messages)
2. POST endpoint for sending messages (agent/customer sends messages)

This is a proven pattern (used by Basecamp, GitHub notifications).

### 5. AI Greeting Bot: Reuse Existing ChatAgent vs. New ChatRouter

**Decision:** Create a new `ChatRouter` Durable Object that orchestrates the flow: AI greeting (via existing Gemini API) → info collection → agent routing → handoff to human agent.

**Rationale:**
- The existing `ChatAgent` is designed for internal agent AI assistance, not customer-facing conversations
- `ChatRouter` has a different lifecycle: it needs to track chat state (collecting → waiting → active → closed), manage agent assignment, and trigger ticket creation on close
- `ChatRouter` uses the Gemini API directly for AI greeting (same OpenAI SDK, different system prompt)
- Alternative: Extend `ChatAgent` — would require significant refactoring of system prompt and lifecycle

### 6. Chat-to-Ticket Auto-Creation: On Chat Close vs. On Chat Start

**Decision:** Create the ticket when the chat closes (agent ends chat or timeout after 30 minutes of inactivity).

**Rationale:**
- Chat may be resolved without needing a ticket (simple FAQ answer)
- Agent can choose "Save as ticket" or "Close without ticket"
- If agent doesn't explicitly choose, auto-create ticket after 30-minute inactivity timeout
- Alternative: Create ticket at chat start — wastes ticket IDs for chats that don't need them

### 7. Embeddable Widget: iframe vs. Shadow DOM vs. Script Tag

**Decision:** Build the embeddable widget as a standalone JavaScript file that creates a Shadow DOM container. The widget renders a mini React app inside the shadow root.

**Rationale:**
- Shadow DOM provides CSS isolation — widget styles don't leak into host page, host page styles don't affect widget
- No iframe needed — better performance, no cross-origin messaging complexity
- Script tag is simple: `<script src="https://voxcare.com/widget.js" data-account-id="xxx"></script>`
- Alternative: iframe — heavy, slow to load, cross-origin complexity
- Alternative: Web Component — good isolation but more complex build

**Widget build:** Separate Vite build target that outputs a single minified JS file (`widget.js`). The widget bundles its own minimal React runtime (or uses vanilla JS + htm/preact for smaller size).

### 8. Customer Portal Route Prefix: /customer vs. /portal

**Decision:** Use `/customer/*` prefix for all customer-facing pages.

**Rationale:**
- Clear namespace separation from internal app routes (`/tickets`, `/admin/*`, `/settings/*`)
- `/customer/login`, `/customer/register`, `/customer/dashboard`, etc.
- Alternative: `/portal/*` — ambiguous (could be agent portal too)

### 9. Customer Token Expiry: 24h vs. 7d

**Decision:** Customer access tokens expire after 24 hours, refresh tokens after 7 days.

**Rationale:**
- Longer than internal users (1h) because customers are less likely to be on shared machines
- Shorter than 7d access token to limit damage if token is compromised
- Same refresh token pattern — customer can stay logged in indefinitely via refresh
- Alternative: 7d access token — too long if token is leaked

### 10. Chat Session Storage: Durable Object vs. Map

**Decision:** Store active chat sessions in a dedicated `LiveChatController` Durable Object (separate from `AppController`).

**Rationale:**
- Chat sessions have high churn (create, active, close) — keeping them in a separate DO prevents bloating `AppController`
- `LiveChatController` manages: chat sessions, agent assignments, typing indicators, message history
- Each chat session is a keyed sub-state within `LiveChatController`, not a separate DO
- Alternative: One DO per chat session — overkill for small call center, adds DO management overhead

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| SSE connection drops on Cloudflare Workers (idle timeout) | Chat messages may be delayed | Implement heartbeat every 15s + auto-reconnect with exponential backoff on client |
| Customer auth DO storage grows with inactive accounts | DO storage limits | Implement account deactivation after 1 year of inactivity, with email notification before deactivation |
| Embeddable widget XSS if host page has malicious scripts | Widget compromised | Shadow DOM provides some isolation; sanitize all user input; CSP headers on widget endpoint |
| AI greeting bot gives wrong information to customers | Customer frustration | System prompt emphasizes "I'm gathering info to connect you with an agent" — avoid giving definitive answers |
| Agent overload if too many chats queue simultaneously | Slow response times | Implement max concurrent chats per agent (configurable, default: 2); queue overflow goes to AI bot |
| Customer sees another customer's tickets (auth bypass) | **Critical security issue** | All customer endpoints filter by `customerId === token.sub`; middleware verifies customer role cannot access other customers' data |
| Chat transcript contains sensitive data (PII, payment info) | Compliance concern | Chat transcripts stored encrypted in DO; auto-purge after 90 days; agent training on data handling |
| Widget.js bundle size affects host page performance | Slow page load | Target <50KB gzipped; lazy-load React only when widget is opened; use Preact or vanilla JS |

## Migration Plan

### Phase 1: Customer Auth Foundation
1. Extend `Customer` type with auth fields (`passwordHash`, `passwordSalt`, `isActive`, `lastLoginAt`, `emailVerifiedAt`, `verificationToken`, `verificationTokenExpiry`)
2. Migrate existing customer records: set all new fields to defaults (`null`, `false`)
3. Create `CustomerAuthController` DO with register, login, verify, forgot-password endpoints
4. Add `'customer'` to `UserRole` type
5. Test: Register, verify, login, logout, refresh, forgot-password flows

### Phase 2: Customer Portal Pages
6. Build customer login/register/verify pages
7. Build customer dashboard (ticket list, ticket stats)
8. Build customer ticket detail page (reuse public ticket view pattern, but authenticated)
9. Build customer profile page
10. Test: Full portal flow end-to-end

### Phase 3: Live Chat Backend
11. Create `LiveChatController` DO with chat session management
12. Implement AI greeting flow (Gemini API with customer-facing system prompt)
13. Implement agent handoff (chat queue, accept/transfer/decline)
14. Implement SSE message streaming for chat
15. Implement chat-to-ticket auto-creation
16. Test: Full chat flow (customer → AI → agent → ticket)

### Phase 4: Agent Chat UI
17. Build agent chat queue panel in agent dashboard
18. Build agent live chat interface (message input, transcript, customer info sidebar)
19. Build AI summary display for incoming chats
20. Test: Agent receives, handles, and closes chats

### Phase 5: Chat Widget
21. Build embeddable widget (Shadow DOM, standalone JS bundle)
22. Build portal chat page (full-page version of widget)
23. Test: Widget on external website, portal chat

### Phase 6: Polish & Security
24. Rate limiting for customer auth endpoints (separate from internal rate limits)
25. CSP headers for customer portal
26. Chat transcript auto-purge (90 days)
27. Account deactivation after 1 year inactivity

**Rollback:** All changes are additive. Rollback = deploy previous version. No data migration needed since all new fields are nullable/optional.

## Open Questions

1. **Widget JS hosting** — Should `widget.js` be served from the same domain as the VoxCare app (e.g., `voxcare.com/widget.js`) or from a separate CDN? Same domain is simpler but requires CORS config for external sites.

2. **AI greeting model** — Should the AI greeting use the same Gemini model as the internal AI (gemini-2.5-flash) or a faster/cheaper model? The greeting needs to be fast (<2s response) to avoid customer frustration.

3. **Chat transcript retention** — 90 days auto-purge is the default. Should admins be able to configure this? What about compliance requirements (some industries require longer retention)?

4. **Max concurrent chats per agent** — Default of 2 seems reasonable, but should this be configurable per agent (based on experience level) or globally?

5. **Customer portal branding** — Should the customer portal use the same branding as the internal app (company name, logo from system settings), or should it be separately branded?
