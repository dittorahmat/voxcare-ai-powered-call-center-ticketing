## Context

VoxCare is a single-tenant Cloudflare Workers + React call center application for an internal team. Current architecture: Hono backend, React frontend, 3 Durable Objects (AppController, AuthController, ChatAgent), SQLite-backed DO storage. Cloudflare AI Gateway for AI features. All critical gaps have been identified through a comprehensive audit.

## Goals / Non-Goals

**Goals:**
- Add email channel (SendGrid inbound → ticket creation, outbound notifications)
- Add internal vs public notes separation
- Add file attachments via Cloudflare R2
- Add canned responses / templates
- Fix ticket re-open workflow
- Implement SLA auto-creation and business-hours awareness
- Implement auto-assignment (round-robin)
- Add 2FA, password recovery, password strength
- Add rate limiting
- Add IP capture in audit log
- Add agent availability states and queue dashboard

**Non-Goals:**
- FreeSWITCH/Asterisk telephony (separate future phase)
- Multi-tenant support (single-tenant only)
- Customer self-service portal
- Knowledge base / article system
- Webhook integrations (Slack, Discord, etc.)
- SMS/WhatsApp integration
- Custom ticket statuses or custom fields
- Fine-grained permission system beyond 3 roles

## Decisions

### 1. Email: SendGrid vs Alternatives

**Decision:** Use SendGrid for both inbound (email-to-ticket) and outbound (notifications).

**Rationale:**
- Free tier: 100 emails/day forever — sufficient for small internal call center
- Inbound Parse provides webhook for incoming emails → easy integration
- Transactional API is simple REST calls
- Alternative: Resend — cheaper ($20/mo for 50K emails) but no inbound email
- Alternative: Mailgun — inbound + outbound but free trial expires, no permanent free tier
- Alternative: self-hosted Postfix — too complex, deliverability issues

**Architecture:**
```
Customer Email → SendGrid MX → Inbound Parse Webhook → POST /api/email/inbound → Create Ticket
                                                                    ↓
Ticket Created → SendGrid Transactional API → Email to Customer/Agent
```

### 2. File Storage: Cloudflare R2

**Decision:** Use Cloudflare R2 for file attachments. Zero egress fees, S3-compatible API.

**Rationale:**
- Already on Cloudflare ecosystem — natural fit
- Free tier: 10GB storage, 1M reads, 1M writes per month
- No egress fees — unlike S3
- Alternative: S3 — egress fees, more complex setup
- Alternative: base64 in DO storage — hits size limits quickly, inefficient

**Max file size:** 10MB per file. Attachment metadata stored in ticket's `attachments` array.

### 3. 2FA: TOTP (Time-based One-Time Password)

**Decision:** Use the `otpauth` library for TOTP generation/verification. Compatible with Google Authenticator, Authy, etc.

**Rationale:**
- Industry standard, widely supported
- No SMS costs or dependencies
- Works offline
- Alternative: email-based 2FA — less secure, round-trip delay
- Alternative: WebAuthn — more complex, requires HTTPS + hardware keys

**Flow:** User enables 2FA → server generates secret → shows QR code → user scans → enters code → server verifies → 2FA enabled. On login: after password check, prompt for TOTP code.

### 4. Rate Limiting: Durable Object Counter

**Decision:** Implement rate limiting using a dedicated `RateLimiter` Durable Object that tracks request counts per IP with sliding window.

**Rationale:**
- No external dependency needed
- DO storage is fast (SQLite-backed)
- Sliding window: track requests per IP per minute
- Limits: 100 req/min general API, 10 req/min auth endpoints
- Alternative: Cloudflare Rate Limiting — costs extra ($20/mo), less flexible
- Alternative: token bucket in memory — lost on worker restart

### 5. Business Hours SLA: Calculation at Query Time

**Decision:** Calculate SLA deadlines considering business hours and holidays at query time (when displaying SLA timer), not at storage time. Store raw `resolutionDeadline` but compute "effective remaining time" considering working hours.

**Rationale:**
- Simpler storage model — just store the raw deadline
- Holidays can be added later without recalculating all deadlines
- Working hours config can change without migrating data
- Alternative: pre-calculate "effective deadline" — breaks when config changes

**Algorithm:** Count working minutes between now and deadline, skipping non-working hours and holidays.

### 6. Auto-Assignment: Round-Robin on Ticket POST

**Decision:** Wire the existing round-robin algorithm into `POST /api/tickets`. After ticket creation, find the next available agent and set `assignedTo`.

**Algorithm:**
1. Get all agents with `availability === 'available'`
2. Sort by `lastAssignedAt` ascending
3. Assign to the first one
4. Update `lastAssignedAt` and set `availability === 'busy'`
5. If no agent available, leave `assignedTo` as null (unassigned queue)

### 7. Internal vs Public Notes: Separate Fields

**Decision:** Split `description` into three fields:
- `description` — original problem description (immutable after creation)
- `internalNotes` — array of `{ text, authorId, timestamp }` visible only to agents
- `publicNotes` — single `{ text, authorId, timestamp }` visible to customer (included in email)

**Rationale:**
- Array of internal notes allows conversation thread
- Single public note for customer-facing communication
- Clean separation of concerns

### 8. Canned Responses: Stored in AppController DO

**Decision:** Store canned responses in a Map on AppController with admin CRUD. Variables: `{{customer_name}}`, `{{ticket_id}}`, `{{agent_name}}`.

**Rationale:**
- Simple storage, no new dependency
- Small number of templates (<50) fits in memory
- Alternative: separate DO — unnecessary complexity

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| SendGrid free tier limit (100/day) | May run out during high volume | Monitor usage; upgrade to Essentials ($20/mo) if needed |
| R2 file size limits (10MB max) | Large files rejected | Clear error message; suggest file compression |
| 2FA adds login friction | Users may find it annoying | Make 2FA optional for agents, required for admins only |
| Rate limiting may block legitimate users | False positives on shared IPs | Log rate limit hits for review; configurable limits |
| Business hours SLA calculation is complex | Performance impact on large datasets | Cache calculation results; only compute when displaying |
| Auto-assignment may overload single agent | If only one agent available | Supervisor can manually reassign |
| Single DO for all app data | Storage limits, single point of failure | Monitor DO storage size; plan migration to split DOs at scale |
| Inbound email spoofing | Fake emails creating tickets | Validate SendGrid webhook signature; only accept from configured domains |
