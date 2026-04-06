## Context

VoxCare is a Cloudflare Workers + React call center ticketing application with ~20 completed change proposals across four prior phases. The current state includes: JWT authentication with 2FA, ticket CRUD with SLA tracking, customer management, agent queue dashboard, analytics (volume, SLA compliance, agent performance), real-time SSE notifications, global search, bulk operations, canned responses, file attachments (R2), and email-to-ticket via SendGrid inbound webhook.

**Current architecture:** Hono backend on Cloudflare Workers, 4 Durable Objects (AppController for data, AuthController for auth, ChatAgent for AI sessions, RateLimiter for rate limiting), React 18 frontend with TypeScript, Zustand state management, TanStack React Query, Shadcn/UI, Recharts for charts. Data stored as JSON maps in DO storage (SQLite-backed persistence).

**Constraints:**
- Single-tenant only (no multi-tenant support needed)
- Cloudflare Workers ecosystem (no traditional server, no persistent connections beyond DOs)
- Durable Objects have storage limits (~10GB per DO) — auto-close rules need careful cleanup
- SendGrid free tier: 100 emails/day
- No traditional database — all data in DO Map-based storage
- Telephony is deferred (FreeSWITCH on VPS planned for future phase)

**Stakeholders:** Call center agents (daily ticket work), supervisors (monitoring, reports), admins (configuration, user management), customers (email notifications, CSAT surveys)

## Goals / Non-Goals

**Goals:**
- Complete the ticketing application so it's production-ready independent of telephony
- Wire up real customer-facing email notifications (currently stubs)
- Add missing ticket workflow features (merge, link, auto-close, saved views, tags, CSAT)
- Enhance reporting (PDF export, wallboard, FCR/AHT metrics, scheduled reports)
- Activate skills-based routing that already has data model support
- Add shift scheduling and break management for workforce visibility
- Implement SLA breach auto-escalation workflow
- Improve agent UX with keyboard shortcuts and activity filtering

**Non-Goals:**
- FreeSWITCH/Asterisk telephony integration (separate future phase)
- Multi-tenant / multi-organization support
- Customer self-service portal (read-only ticket view link is the extent of customer-facing UI)
- WhatsApp/SMS/social channel integration
- Knowledge base / article system
- Custom fields or custom ticket statuses
- Fine-grained permissions beyond current 3-role RBAC
- Predictive dialer or outbound calling

## Decisions

### 1. Email Notifications: SendGrid Transactional API

**Decision:** Use SendGrid Transactional API (v3/mail/send) for all outbound customer emails. Templates stored in DO storage, rendered server-side before sending.

**Rationale:**
- Already using SendGrid for inbound parse — natural choice for outbound
- Free tier (100/day) sufficient for small call center
- HTML email templates stored in DO storage allows admin customization without code changes
- Alternative: Resend — cheaper but no inbound email (would need two providers)
- Alternative: Nodemailer + SMTP — deliverability issues from Cloudflare Workers

**Template variables:** `{{customer_name}}`, `{{ticket_id}}`, `{{ticket_title}}`, `{{ticket_status}}`, `{{ticket_url}}`, `{{agent_name}}`, `{{resolution_notes}}`

### 2. Public Ticket View: Token-Authenticated Read-Only Page

**Decision:** Generate a unique token per ticket (UUID v4, stored on the ticket). Public URL: `/public/ticket/:token`. Read-only view showing ticket status, resolution notes, and CSAT survey form.

**Rationale:**
- No customer login required — token is the auth mechanism
- Simple, shareable link in email notifications
- Token stored on ticket, verified on page load
- Alternative: magic link login — unnecessary complexity for read-only view
- Alternative: customer portal — out of scope for this phase

### 3. Ticket Merging: Soft Merge with History Preservation

**Decision:** When tickets are merged, the primary ticket absorbs all notes, attachments, and transcript from source tickets. Source tickets get `status: merged` with a `mergedInto` pointer. Source tickets remain viewable (read-only) with a link to the primary ticket.

**Rationale:**
- Preserves audit trail — no data loss
- Source tickets still accessible for reference
- Simple pointer-based relationship
- Alternative: hard merge (delete source tickets) — loses audit trail, dangerous
- Alternative: linking only (no merge) — doesn't consolidate the conversation

**Data model:**
```
Ticket.mergedInto: string | null        // points to primary ticket ID
Ticket.status: "merged"                 // special status for source tickets
```

### 4. Related Tickets: Bidirectional Links with Type

**Decision:** Store relationships in a separate `ticketRelations` Map. Each relation has `{ id, ticketA, ticketB, type: "parent-child" | "related", createdAt }`. Display bidirectionally — if A is parent of B, B shows A as parent, A shows B as child.

**Rationale:**
- Decoupled from ticket data — no need to modify Ticket type
- Supports multiple relationship types
- Easy to query: find all relations where ticketA === id OR ticketB === id
- Alternative: add `parentId`, `relatedIds[]` to Ticket — limits to single parent, harder to maintain bidirectional consistency

### 5. Auto-Close Rules: Cron-Triggered Evaluation

**Decision:** Auto-close rules evaluated via Cloudflare Cron Triggers (daily at 00:00 UTC). Rules stored in DO storage. Evaluation iterates all tickets matching criteria and transitions them.

**Rationale:**
- Cloudflare Cron Triggers are the native scheduling mechanism for Workers
- Daily evaluation sufficient for auto-close (not real-time critical)
- Alternative: in-worker setTimeout — unreliable on serverless
- Alternative: external cron service — adds dependency

**Rule structure:**
```json
{
  "id": "rule-1",
  "name": "Auto-close resolved after 7 days",
  "condition": { "status": "resolved", "daysSinceUpdate": 7 },
  "action": { "setStatus": "closed" },
  "enabled": true,
  "createdAt": "..."
}
```

### 6. Saved Views: Per-User with Shared Defaults

**Decision:** Saved views stored in DO storage keyed by userId. Default views (e.g., "All Open", "My Tickets") created as system defaults (userId: "system"). Each view stores: `{ name, filters, sort, isDefault }`.

**Filters stored:** status, priority, assignee, tags, date range, search query, SLA status

**Rationale:**
- Simple storage model
- Per-user isolation prevents view conflicts
- System defaults provide baseline for all users
- Alternative: global shared views — too rigid, agents can't personalize

### 7. Ticket Tags: Freeform with Autocomplete

**Decision:** Tags are freeform strings stored as `string[]` on Ticket. Autocomplete suggests previously used tags (fetched from all existing tags). Tags filterable in ticket list and analytics.

**Rationale:**
- No tag taxonomy needed — agents create tags as needed
- Autocomplete prevents typos and encourages consistency
- Simple array on Ticket type
- Alternative: managed tag system — overkill for small call center
- Alternative: categories-only — too rigid, categories are predefined, tags are ad-hoc

### 8. PDF Generation: Client-Side with @react-pdf/renderer

**Decision:** Generate PDFs client-side using `@react-pdf/renderer`. Triggered from ticket detail page ("Export PDF") and analytics page ("Export Report").

**Rationale:**
- Client-side avoids server-side rendering complexity on Workers
- `@react-pdf/renderer` uses React components — fits existing stack
- PDFs generated in browser, downloaded directly
- Alternative: server-side PDF generation on Workers — complex, requires PDF library in Workers environment
- Alternative: print-to-PDF via browser — inconsistent formatting, no branding

### 9. Real-Time Wallboard: Dedicated Page with Auto-Refresh

**Decision:** Wallboard is a React page at `/wallboard` with full-screen layout. Data fetched every 15 seconds from a dedicated `/api/wallboard` endpoint. No SSE needed — 15-second polling is sufficient for TV display.

**Rationale:**
- Wallboard is read-only display — doesn't need instant updates
- 15-second polling reduces server load
- Dedicated endpoint aggregates all needed data in one call
- Alternative: SSE subscription — overkill for display-only
- Alternative: WebSocket — unnecessary complexity

**Wallboard data:**
- Active agents count / total agents
- Tickets by status (open, in-progress, resolved)
- SLA compliance rate today
- Average wait time (if telephony existed; for now, avg first response time)
- Today's ticket count (new vs resolved)
- Top 5 agents by tickets resolved today

### 10. CSAT Surveys: Email Link + In-App Form

**Decision:** CSAT survey is a simple 1-5 star rating + optional comment. Triggered when ticket status changes to `resolved`. Email sent to customer with survey link (same public ticket view token). Survey results stored in `csatResponses` Map.

**Rationale:**
- Simple = higher response rate
- Reuses public ticket view infrastructure
- Star rating is universally understood
- Alternative: multi-question survey — lower response rate
- Alternative: phone survey — impractical

### 11. Skills-Based Routing: Category-to-Skills Mapping

**Decision:** Define a mapping from ticket `category` to required `skill`. When a ticket is created, the assignment algorithm first tries agents whose `skills[]` array includes the matching skill. If no match found, falls back to round-robin among all available agents.

**Rationale:**
- Uses existing `skills` field on User and `category` field on Ticket
- Fallback ensures tickets still get assigned even when no specialist is available
- Simple string matching (no skill levels or weights)
- Alternative: skill proficiency levels — overkill, requires maintenance
- Alternative: ML-based routing — unnecessary complexity

**Mapping (configurable in settings):**
```json
{
  "technical-support": ["technical", "networking"],
  "billing": ["billing", "payments"],
  "general-inquiry": []
}
```

### 12. Shift Scheduling: Weekly Template-Based

**Decision:** Shifts defined as weekly templates. Admin creates shift entries: `{ day, startTime, endTime, agentIds[] }`. Agents see their week. Supervisor sees coverage heatmap.

**Rationale:**
- Weekly template is simplest practical model
- Covers 95% of call center scheduling needs
- Heatmap helps supervisors spot gaps
- Alternative: recurring rules ("Agent A works Mon-Fri 9-5") — less flexible for exceptions
- Alternative: calendar integration — out of scope

### 13. Break Management: Agent-Initiated with Supervisor Visibility

**Decision:** Agents toggle break status from their sidebar availability selector. Break start/end times logged. Duration tracked. Supervisor sees current break status and duration on Agent Queue dashboard.

**Rationale:**
- Simple toggle — minimal friction
- Audit log tracks all break events
- Duration visible to supervisor for accountability
- Alternative: scheduled breaks — too rigid
- Alternative: manager-approved breaks — adds workflow complexity

### 14. SLA Breach Auto-Escalation: Priority Bump + Notification

**Decision:** When SLA breach detected (during cron evaluation or on ticket load), bump priority one level and create notification for supervisor. Escalation logged in audit trail. Maximum escalation: critical (no bump beyond critical).

**Rationale:**
- Priority bump is actionable — ticket moves up in queue
- Supervisor notification ensures visibility
- Audit trail for compliance
- Alternative: auto-assign to senior agent — too aggressive, may overload
- Alternative: email-only notification — not actionable enough

### 15. FCR Tracking: Heuristic-Based Detection

**Decision:** A ticket is marked as FCR if: (1) resolved within first interaction window (configurable, default 1 hour), AND (2) no follow-up notes added after resolution, AND (3) customer did not reply/reopen. Stored as `fcrFlag: boolean` on Ticket.

**Rationale:**
- Heuristic approximation — no true "first interaction" signal without telephony
- Configurable window allows tuning
- Simple boolean on Ticket
- Alternative: manual FCR flag by agent — unreliable, adds friction
- Alternative: require telephony integration — blocks this feature

### 16. AHT Tracking: Assignment-to-Resolution Delta

**Decision:** AHT calculated as `resolvedAt - assignedAt` for each ticket. Stored as `handleTimeSeconds` on ticket resolution. Per-agent AHT = average of all resolved tickets in date range.

**Rationale:**
- Uses existing timestamps — no new data needed
- Clear, measurable metric
- Alternative: active time tracking (excluding idle) — complex, requires activity monitoring
- Alternative: talk time + wrap-up time — requires telephony

### 17. Activity Timeline Filtering: Client-Side with Server Data

**Decision:** Activity timeline fetched as-is from server. Filtering (by type: status change, note, assignment, SLA event, email) applied client-side via React state.

**Rationale:**
- Timeline data is small enough (<100 entries per ticket) for client-side filtering
- Reduces server complexity
- Instant filter response
- Alternative: server-side filtering — unnecessary API round-trip for small datasets

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| SendGrid free tier (100/day) hit by notifications + CSAT + scheduled reports | Emails may fail silently | Monitor SendGrid quota; alert admin when approaching limit; upgrade to Essentials ($20/mo) if needed |
| Auto-close rules misconfigured could close tickets prematurely | Customer tickets closed accidentally | Default rules conservative (7+ days); rules require admin approval; audit log tracks all auto-closes |
| DO storage growth (new entity maps: relations, CSAT, shifts, breaks) | May approach DO storage limits at scale | Implement auto-cleanup for old CSAT responses (>90 days), archived merged tickets, old break logs |
| PDF generation client-side may be slow for large tickets | User experience degraded | Show loading indicator; paginate PDF for very large transcripts |
| Skills-based routing depends on accurate skills data | Poor skills data = poor routing | Admin UI for skills management; fallback to round-robin ensures tickets still assigned |
| Public ticket view token exposure | Anyone with link can view ticket | Token is UUID v4 (unguessable); no sensitive data (internal notes hidden); token regenerates on request |
| Wallboard 15-second polling adds load | Negligible for small teams | Configurable refresh interval; disable auto-refresh when tab not visible (Page Visibility API) |
| FCR heuristic is approximate | May not reflect true first contact resolution | Document as approximation; improve when telephony integration provides real interaction data |
| Shift scheduling is weekly-template only | Can't handle one-off schedule changes | Admin can manually edit individual weeks; future enhancement: recurring rules with exceptions |
| CSAT response rate may be low | Skewed satisfaction data | Keep survey simple (1-5 stars + optional comment); send promptly after resolution; follow-up reminder after 24h |

## Migration Plan

**Deployment order:**
1. Email notifications (wire up SendGrid — currently a stub, lowest risk)
2. Ticket tags + saved views (additive, no data migration)
3. Related tickets + ticket merge (new data structures, additive)
4. CSAT surveys (builds on email notifications + public ticket view)
5. Auto-close rules (new cron trigger, additive)
6. Skills-based routing (uses existing skills field, additive)
7. SLA breach workflow (enhancement to existing SLA system)
8. Break management + shift scheduling (additive, new UI)
9. Wallboard + PDF reports + FCR/AHT (additive analytics)
10. Keyboard shortcuts + activity filter + bulk email (UX polish)

**Rollback strategy:** All changes are additive — no breaking changes. Rollback = deploy previous version. No data migration needed since all new fields are nullable/optional.

**Data migration:** Not required. All new fields (`tags`, `mergedInto`, `fcrFlag`, `handleTimeSeconds`) default to null/empty for existing tickets.

## Open Questions

1. **CSAT survey timing** — Should CSAT be sent immediately on resolution, or after a configurable delay (e.g., 24 hours to let the solution "settle")? Defaulting to immediate for simplicity.

2. **Auto-close rule granularity** — Should rules support conditions beyond status + days (e.g., "only auto-close if customer hasn't replied in X days")? Defaulting to simple status + inactivity for v1.

3. **Shift schedule timezone** — All shifts in system timezone (configured in system settings), or per-agent timezone? Defaulting to system timezone for simplicity.

4. **Wallboard data scope** — Should wallboard show "today only" or configurable date range? Defaulting to today for simplicity, with range selector as future enhancement.

5. **PDF branding** — Should PDFs include company branding (logo, colors) from system settings? Defaulting to clean, minimal branding for v1.
