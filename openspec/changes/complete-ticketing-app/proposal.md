## Why

VoxCare has completed three prior implementation phases (`harden-call-center-core`, `call-center-critical-fixes`, `production-readiness-phase-2`, `fix-remaining-gaps`) that built a solid foundation: authentication, ticket CRUD, SLA tracking, customer management, analytics, and real-time notifications. However, several gaps remain that prevent VoxCare from being a **complete, production-ready ticketing application** for call center operations.

The biggest gaps are: **email notifications are stubs** (console.log only, nothing reaches customers), **ticket workflow is incomplete** (no merge, split, related tickets, auto-close rules, saved views, CSAT surveys), **reporting is basic** (no PDF export, no real-time wallboard, no FCR/AHT metrics), and **workforce management is minimal** (no shift scheduling, skills-based routing exists in data model but isn't active).

Telephony integration (FreeSWITCH on VPS) is acknowledged as a future need but is intentionally deferred — this change focuses on making the **ticketing app itself complete** so that when telephony arrives, the ticketing backbone is rock-solid.

## What Changes

### Email Notifications (Customer-Facing)
- **Wire up SendGrid for real outbound emails** — Replace console.log stubs with actual SendGrid Transactional API calls for customer notifications: ticket created, ticket updated, ticket resolved
- **Email threading in tickets** — Display email conversation history inline on the ticket detail page so agents see the full email thread with the customer
- **Customer "View Ticket" link** — Email templates include a public link where customers can view their ticket status (read-only, token-authenticated)

### Advanced Ticket Workflow
- **Ticket merging** — Combine two or more tickets into one (duplicate reports, same issue from same customer). Merged tickets preserve history and are marked as `merged`
- **Related/linked tickets** — Link tickets together as parent/child or related. Display linked tickets on ticket detail page
- **Auto-close rules** — Configurable rules that automatically transition tickets (e.g., "auto-close resolved tickets after 7 days of inactivity", "auto-close if customer doesn't respond after 3 follow-ups")
- **Saved ticket views** — Agents save custom filter combinations (e.g., "My Open Tickets", "SLA Breached", "Unassigned High Priority"). Views are personal (per-user) with shared defaults
- **Ticket tags/labels** — Freeform tagging system for tickets (e.g., `billing`, `bug-report`, `feature-request`). Tags are filterable in list view and analytics
- **Individual ticket export** — Export a single ticket as PDF (transcript, notes, attachments, timeline) for archival or email to customer

### Customer Satisfaction (CSAT)
- **Post-resolution survey** — When a ticket is resolved, the customer receives an email with a simple satisfaction rating (1-5 stars + optional comment). Results stored and displayed in analytics
- **CSAT dashboard widget** — Average CSAT score, response rate, trend over time on the Analytics page

### Reporting & Analytics
- **PDF report export** — Generate formatted PDF reports (ticket summary, SLA compliance, agent performance)
- **Real-time wallboard** — Full-screen dashboard for TV display showing: active calls, queue depth, agent statuses, SLA compliance rate, today's ticket counts
- **First Contact Resolution (FCR)** — Track whether a ticket was resolved on first interaction (no follow-ups needed). Display FCR rate on Analytics page
- **Average Handle Time (AHT)** — Track average time agents spend per ticket (from assignment to resolution). Display per-agent and overall AHT
- **Scheduled reports** — Configurable recurring email reports (daily summary, weekly SLA compliance) sent to supervisors/admins

### Workforce Management
- **Shift scheduling** — Admin defines shifts (start time, end time, assigned agents). Agents see their upcoming shifts. Supervisors see coverage gaps
- **Active skills-based routing** — The `skills` field on User already exists. Now actually use it: tickets with a `category` are routed to agents whose skills match that category. Fallback to round-robin if no match
- **Break management** — Agents can log breaks with reason (lunch, personal, training). Breaks tracked in audit log. Supervisors see break duration on agent queue dashboard

### SLA Breach Workflow
- **Auto-escalation on breach** — When SLA is breached, ticket priority is bumped up one level (low→medium, medium→high, high→critical). Escalation logged and supervisor notified
- **SLA breach notifications** — Real-time notification (SSE + email to supervisor) when a ticket's SLA is breached

### UI Polish & Quality of Life
- **Ticket detail print view** — Clean print-friendly layout for ticket detail page
- **Bulk email to customers** — From ticket list, select multiple tickets and send a bulk status update email to their customers
- **Keyboard shortcuts** — Beyond Cmd+K: `j/k` navigate ticket list, `e` edit ticket, `r` reply/note, `o` open ticket, `a` assign
- **Ticket activity filter** — Activity timeline on ticket detail page filterable by type (status change, note, assignment, SLA event, email)

### Telephony (Deferred but Prepared)
- **Telephony readiness checklist** — Document the prerequisites for FreeSWITCH integration: SIP trunk, VPS setup, ESL library, audio streaming pipeline. This is documentation only, no implementation.

## Capabilities

### New Capabilities

- `email-notifications`: Customer-facing email notifications via SendGrid (ticket created, updated, resolved), email template management, email threading in ticket view, public ticket view link
- `ticket-merge`: Merge duplicate or related tickets, preserve history, mark source tickets as merged
- `related-tickets`: Link tickets as parent/child or related, display linked tickets on detail page
- `auto-close-rules`: Configurable auto-close rules based on inactivity or follow-up count
- `saved-views`: Per-user saved ticket filter combinations with shared defaults
- `ticket-tags`: Freeform tagging system for tickets with filtering and analytics support
- `ticket-pdf-export`: Generate PDF export of individual tickets (transcript, notes, attachments, timeline)
- `csat-surveys`: Post-resolution customer satisfaction surveys, results storage, CSAT analytics
- `pdf-reports`: Generate formatted PDF reports for ticket summary, SLA compliance, agent performance
- `real-time-wallboard`: Full-screen wallboard for TV display showing live call center metrics
- `fcr-tracking`: First Contact Resolution tracking and reporting
- `aht-tracking`: Average Handle Time tracking per agent and overall
- `scheduled-reports`: Configurable recurring email reports for supervisors/admins
- `shift-scheduling`: Shift definition, assignment, coverage tracking
- `skills-based-routing`: Active routing of tickets to agents based on skill-category matching
- `break-management`: Agent break logging with reason tracking and supervisor visibility
- `sla-breach-workflow`: Auto-escalation and notifications on SLA breach
- `activity-filter`: Filterable activity timeline on ticket detail page
- `bulk-email`: Bulk status update emails to customers from ticket list
- `keyboard-shortcuts`: Extended keyboard shortcuts for ticket navigation and actions

### Modified Capabilities

<!-- No existing specs to modify since openspec/specs/ is empty -->

## Impact

- **Frontend**: New pages (Wallboard, Shift Schedule), new components (TicketMergeDialog, RelatedTicketsPanel, SaveViewDialog, TagInput, CSATWidget, BreakTracker, ActivityFilter), modified TicketDetail (email thread, linked tickets, PDF export, activity filter), modified TicketList (tags, saved views, bulk email, keyboard nav), modified Analytics (CSAT, FCR, AHT charts), modified AgentQueue (break tracking), new email templates
- **Backend Worker**: SendGrid outbound email integration, PDF generation endpoint, wallboard data endpoint, CSAT survey endpoints, auto-close rule engine (cron-triggered), skills-based routing logic, SLA breach escalation engine, bulk email endpoint, activity log filtering endpoint
- **Durable Objects**: AppController gains `mergedTickets`, `ticketRelations`, `autoCloseRules`, `savedViews`, `csatResponses`, `shiftSchedules`, `breakLogs` entity maps
- **Data Model**: New types for `TicketMerge`, `TicketRelation`, `AutoCloseRule`, `SavedView`, `TicketTag`, `CSATResponse`, `ShiftSchedule`, `BreakLog`. Extended `Ticket` with `tags[]`, `mergedInto`, `parentId`, `fcrFlag`. Extended `User` with `assignedShifts`. Extended `SLARecord` with `escalationTriggered`
- **External Services**: SendGrid Transactional API (outbound emails). No new infrastructure required — stays on Cloudflare Workers + Durable Objects
- **Dependencies**: PDF generation library (e.g., `@react-pdf/renderer` or `pdf-lib`), cron trigger for auto-close rules (Cloudflare Cron Triggers or worker-internal scheduling)
- **Breaking**: None — all new capabilities are additive
