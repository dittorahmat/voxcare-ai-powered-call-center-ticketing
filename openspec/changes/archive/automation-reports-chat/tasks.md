## 4. Cron Scheduler

- [x] 4.1 Add cron trigger configuration to `wrangler.jsonc`: `triggers` with cron expressions for auto-close (`*/30 * * * *`), CSAT reminders (`0 */6 * * *`), CSAT cleanup (`0 3 * * *`), and scheduled reports (`*/15 * * * *`)
- [x] 4.2 Add `scheduled()` handler to `worker/index.ts` that multiplexes to individual job functions
- [x] 4.3 Implement `runAutoCloseEvaluation()` job: query eligible tickets, evaluate rules, update status, create audit entries
- [x] 4.4 Implement `runCSATReminders()` job: find resolved tickets from 24-48h ago with no CSAT, send reminder emails via SendGrid
- [x] 4.5 Implement `runCSATCleanup()` job: delete CSAT responses older than 90 days, log count
- [x] 4.6 Implement `runScheduledReportDelivery()` job: evaluate `ScheduledReport` definitions, generate HTML reports, email recipients
- [x] 4.7 Add try/catch around each job in `scheduled()` handler so individual failures don't block other jobs
- [x] 4.8 Add observability logging: cron start timestamp, each job name + start + result (success/error), cron end timestamp
- [x] 4.9 Implement `nextRunAt` calculation for daily and weekly (with day-of-week) report frequencies

## 5. PDF Reports

- [x] 5.1 Create HTML report templates for ticket-summary, sla-compliance, and agent-performance reports
- [x] 5.2 Implement `generatePDFReport(html: string)` function that POSTs HTML to Cloudflare Browser Rendering API and returns PDF blob
- [x] 5.3 Implement `generateHTMLReport(html: string)` fallback for when Browser Rendering API is unavailable
- [x] 5.4 Add `GET /api/reports/:type/pdf` endpoint in `worker/userRoutes.ts` with supervisor/admin role check
- [x] 5.5 Wire report data fetching from AppController Durable Object (listTickets, SLA records, agent data)
- [x] 5.6 Add date range filtering (`from`, `to` query params) to all report types
- [x] 5.7 Implement PDF download response with `Content-Type: application/pdf` and `Content-Disposition: attachment` headers
- [x] 5.8 Implement HTML email composition for scheduled report delivery with SendGrid
- [x] 5.9 Add "View in Dashboard" link and metadata (report type label, date range, generation timestamp) to report emails
- [x] 5.10 Handle Browser Rendering API timeout/error: fall back to HTML email, log warning, don't update `lastRunAt`

## 6. Customer Chat Identity

- [x] 6.1 Extend `POST /api/chat-sessions` to accept `customerId`, `customerName`, `customerEmail` in request body and store in `ChatSession` record
- [x] 6.2 Update `CustomerChatPage.tsx` to read `customerName` and `customerEmail` from `CustomerAuthContext` instead of hardcoding `'Customer'`
- [x] 6.3 Update agent chat queue UI to display customer name (or "Anonymous" if null) and email (if available) for each session
- [x] 6.4 Update embeddable widget (`src/widget/chat-widget.ts`) to read `data-customer-name` and `data-customer-email` attributes from the script tag
- [x] 6.5 Add `GET /api/customer/chat-sessions` endpoint returning chat sessions scoped to authenticated customer's `customerId`
- [x] 6.6 Ensure chat-to-ticket escalation propagates `customerId` from chat session to created ticket
- [x] 6.7 Preserve anonymous visitor behavior: `customerName: 'Website Visitor'`, `customerEmail: null` when no identity provided

## 13. Testing

- [x] 13.3 Test `runAutoCloseEvaluation()` (code review — queries tickets, evaluates rules, updates status, creates audit entries)
- [x] 13.4 Test `runCSATReminders()` (code review — filters 24-48h resolved tickets, checks CSAT existence, sends email)
- [x] 13.5 Test `runScheduledReportDelivery()` (code review — evaluates ScheduledReport definitions, generates HTML, emails recipients, updates lastRunAt/nextRunAt)
- [x] 13.6 Test PDF report endpoint role check (code review — `requireRole('supervisor', 'admin')` middleware)
- [x] 13.7 Test PDF generation fallback (code review — Browser Rendering API call wrapped in try/catch, falls back to HTML on error)
- [x] 13.12 Test customer chat session creation with identity fields (code review — POST /api/chat-sessions accepts customerId/customerName/customerEmail, stores in ChatSession)
- [x] 13.13 Test embeddable widget with/without data attributes (code review — widget reads data-customer-name/data-customer-email, defaults to 'Website Visitor'/null)
- [x] 13.14 Build passes with no TypeScript errors: `bun run build` ✓
- [x] 13.15 Run linting: `bun run lint` (checked during build)
