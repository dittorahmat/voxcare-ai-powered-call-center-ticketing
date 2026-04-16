## Why

VoxCare's operations team currently performs three manual tasks that should be automated: **(1)** agents must manually close stale tickets and send CSAT surveys, **(2)** supervisors must manually generate and email reports, and **(3)** customer chat sessions are anonymous with no link to authenticated customer profiles. This change addresses all three gaps using Cloudflare-native infrastructure (Cron Triggers, Browser Rendering API) and frontend identity plumbing that already exists.

## What Changes

### Cron Scheduler
- Cloudflare Cron Triggers configured in `wrangler.jsonc` invoking a `scheduled()` handler
- Four scheduled jobs: auto-close rule evaluation (every 30m), CSAT reminders (every 6h), CSAT cleanup (daily 3am), scheduled report delivery (every 15m checks for due reports)
- Resilient to individual job failures — each job is try/caught independently
- Full observability: each job logs start, duration, result

### PDF Reports
- Server-side PDF generation via Cloudflare Browser Rendering API (not `@react-pdf/renderer` which breaks on Workers WASM)
- `GET /api/reports/:type/pdf` endpoint accepting date range query params
- HTML report email fallback when Browser Rendering API is unavailable
- Scheduled report delivery via cron: HTML email with optional PDF attachment
- Three report types: ticket-summary, sla-compliance, agent-performance

### Customer Chat Identity
- Chat sessions created by authenticated customers include `customerId`, `customerName`, `customerEmail`
- `POST /api/chat-sessions` accepts and stores customer identity fields
- Agent chat queue UI displays customer name/email for each session
- Embeddable widget accepts `data-customer-name` and `data-customer-email` script attributes
- `GET /api/customer/chat-sessions` endpoint for customers to view their chat history
- Customer identity propagated to tickets on chat-to-ticket escalation

## Capabilities

### New Capabilities

- `cron-automation`: Cloudflare Cron Triggers for auto-close evaluation, CSAT reminders, CSAT cleanup, and scheduled report delivery
- `pdf-report-delivery`: Server-side PDF generation via Browser Rendering API + scheduled HTML/PDF email report delivery
- `customer-chat-identity`: Link authenticated customer profiles to chat sessions, display identity in agent UI, accept identity via embeddable widget attributes

### Modified Capabilities

<!-- None -- all new capabilities -->

## Impact

- **Backend Worker**: `worker/index.ts` gains a `scheduled()` handler. New route group `/api/reports/:type/pdf` for PDF generation. `POST /api/chat-sessions` extended with customer identity fields. New `GET /api/customer/chat-sessions` endpoint.
- **wrangler.jsonc**: Adds `triggers` block with cron expressions. May need Browser Rendering API binding.
- **Frontend**: Agent chat queue UI updated to show customer name/email. `CustomerChatPage.tsx` reads from `CustomerAuthContext` instead of hardcoding `customerName='Customer'`. Embeddable widget reads `data-*` attributes.
- **Dependencies**: No new npm dependencies. Uses existing SendGrid for email, existing analytics endpoints for report data. `@react-pdf/renderer` is already in package.json but will NOT be used (WASM incompatibility on Workers).
- **Breaking**: None. All changes are additive.
- **External Services**: Cloudflare Browser Rendering API (for PDF generation). SendGrid (for report email delivery).
