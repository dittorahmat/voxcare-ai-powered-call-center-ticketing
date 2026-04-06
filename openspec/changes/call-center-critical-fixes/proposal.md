## Why

VoxCare has solid foundations (auth, CRUD, analytics, notifications) but lacks 15 critical features required for any production call center: no email-to-ticket channel, no internal vs public notes, no canned responses, no file attachments, no email notifications, no business-hours SLA, no ticket re-open, no auto-assignment, no CSAT, no 2FA, no rate limiting, no password recovery, and no SLA auto-creation on ticket creation. This change addresses all critical gaps.

## What Changes

### Phase 1: Communication Channels
- **Email-to-Ticket via SendGrid Inbound Parse** — Incoming emails to a SendGrid-configured address automatically create tickets. Customer email is matched to existing customer or creates a new one. Email body becomes ticket transcript, attachments are stored.
- **Email Notifications to Customers** — When a ticket is created, updated, or resolved, an email is sent to the customer via SendGrid Transactional API. HTML email template with ticket details and a "View Ticket" link.
- **Email Notifications to Agents** — When a ticket is assigned to an agent or escalated, the agent receives an email notification.

### Phase 2: Ticket Workflow
- **Internal vs Public Notes** — TicketDetail page gets two separate note fields: "Internal Notes" (visible only to agents) and "Resolution Notes" (visible to customer in email/portal).
- **Canned Responses / Templates** — Admin can create reply templates with variables (`{{customer_name}}`, `{{ticket_id}}`). Agents can insert canned responses into notes with a click.
- **File Attachments** — Upload files (images, PDFs, documents) to tickets via Cloudflare R2 storage. Display attachment list on ticket detail. Max 10MB per file.
- **Ticket Re-open** — Add `reopened` status. Resolved tickets can be re-opened by agents or via incoming email.
- **SLA Auto-Creation** — Every new ticket automatically gets an SLA record based on its priority's SLA config.
- **Auto-Assignment** — Round-robin auto-assignment on ticket creation to the next available agent. Falls back to unassigned if no agent available.

### Phase 3: SLA Improvements
- **Business Hours SLA** — SLA timer only runs during configured working hours (e.g., 08:00–18:00). Pauses outside working hours and on configured holidays.
- **Holiday Schedules** — Admin can configure holidays where SLA is paused.

### Phase 4: Security & Compliance
- **Two-Factor Authentication (2FA)** — TOTP-based 2FA using `otpauth` library. Optional per-user, enforced for admin role. QR code setup during first login.
- **Password Recovery** — "Forgot password" flow: user enters email, receives reset link via SendGrid, sets new password. Token expires in 1 hour.
- **Password Strength Rules** — Minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number. Enforced on registration and password change.
- **Rate Limiting** — Cloudflare Workers rate limiting via Durable Object: 100 requests/minute per IP for general API, 10 requests/minute for auth endpoints.
- **IP Address in Audit Log** — Capture `cf-connecting-ip` header from Cloudflare on every request and store in audit entries.

### Phase 5: Agent Management
- **Agent Availability States** — Extend availability enum to include `available`, `busy`, `break`, `lunch`, `offline`. Agents can set their own status.
- **Agent Queue Dashboard** — Supervisor view showing all agents with real-time status, active ticket count, and last activity.

### Telephony (Deferred)
- FreeSWITCH/Asterisk integration is scoped as a **separate future phase**. The current "Live Call" page using browser SpeechRecognition serves as a functional prototype. When ready, a FreeSWITCH bridge can be added with the existing `TelephonyBridge` interface.

## Capabilities

### New Capabilities

- `email-integration`: SendGrid inbound parse for email-to-ticket, SendGrid transactional API for outbound notifications, email template management
- `internal-notes`: Separate internal and public note fields on tickets with visibility controls
- `canned-responses`: Reply templates with variable substitution for agents
- `file-attachments`: File upload to Cloudflare R2, attachment display on tickets
- `ticket-reopen`: Re-open resolved tickets with status `reopened`
- `sla-auto-creation`: Automatic SLA record creation on ticket creation
- `auto-assignment`: Round-robin ticket assignment on creation
- `business-hours-sla`: SLA calculation respecting working hours and holidays
- `holiday-schedules`: Holiday configuration for SLA pausing
- `two-factor-auth`: TOTP-based 2FA with QR code setup
- `password-recovery`: Forgot password flow with email reset link
- `password-strength`: Password complexity enforcement
- `rate-limiting`: API rate limiting per IP
- `agent-availability`: Extended agent status states
- `agent-queue-dashboard`: Supervisor view of agent status and workload

### Modified Capabilities

- `ticket-management`: Tickets now have internal/public notes, attachments, reopened status, auto-assigned agent, auto-created SLA record
- `sla-management`: SLA calculation respects business hours and holidays
- `user-auth`: Adds 2FA, password recovery, password strength rules, IP capture in audit log
- `analytics-reporting`: Adds first contact resolution rate metric
- `settings-management`: Adds email configuration (SendGrid API key, from address), canned response management, holiday management

## Impact

- **Frontend**: New pages (Canned Responses management), new components (file upload, note type toggle, 2FA setup, password reset form, holiday picker), modified ticket detail page (dual notes, attachments), modified SLA timer (business hours awareness), modified settings (email config, holidays)
- **Backend Worker**: SendGrid integration (inbound webhook handler, outbound email sender), rate limiting middleware, IP capture middleware, SLA business hours calculation, auto-assignment logic, SLA auto-creation on ticket POST
- **Cloudflare R2**: New bucket for file attachments. Bucket binding added to wrangler.jsonc.
- **Durable Objects**: AppController gains `cannedResponses`, `holidays` maps. Audit entries now capture IP address.
- **Data Model**: New `CannedResponse`, `Holiday` types. Extended `Ticket` with `internalNotes`, `attachments`. Extended `User` with `totpSecret`, `is2faEnabled`. Extended `AuditEntry` with `ipAddress` population.
- **Dependencies**: `@sendgrid/mail` for outbound email, `otpauth` for TOTP generation/verification, `@cloudflare/workers-types` updated for R2
- **External Services**: SendGrid account required (free tier: 100 emails/day). Cloudflare R2 bucket (free tier: 10GB storage, 1M reads/month, 1M writes/month).
