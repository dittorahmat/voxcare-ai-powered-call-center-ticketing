## Context

VoxCare is a Cloudflare Workers + React call center application with 56 API endpoints, 16 routes, and ~16 frontend pages. Two major implementation phases are complete (101 + 105 tasks). An audit identified 11 remaining gaps, all of which are frontend-only fixes except the wrangler.jsonc secret replacement.

## Goals / Non-Goals

**Goals:**
- Wire existing `useNotificationStream` hook to enable real-time push notifications
- Fix all identified UI bugs (analytics filter, dashboard greeting, bulk assign, call record save)
- Add missing UX (CustomerDetail edit, 404 page, admin nav link, settings nav placement)
- Secure hardcoded secrets in wrangler.jsonc

**Non-Goals:**
- No new API endpoints needed — all backend APIs already exist
- No new dependencies — all required components and hooks already exist
- No architectural changes

## Decisions

### 1. SSE Hook Placement: MainLayout vs Dedicated Provider

**Decision:** Wire `useNotificationStream` in MainLayout alongside the existing unread-count polling.

**Rationale:**
- MainLayout wraps all authenticated pages — hook runs once per session
- Can share event handler with NotificationDropdown for sound/desktop alerts
- Alternative: AuthContext provider — adds complexity, not needed since SSE is notification-specific

### 2. Analytics Range Filter: API-Side vs Client-Side

**Decision:** Pass `?from=` and `?to=` query parameters to the API. Compute date strings client-side from the selected range.

**Rationale:**
- Backend already supports `from` and `to` params on analytics endpoints
- Server-side filtering is more efficient than fetching all data
- Alternative: client-side filter — would require fetching all tickets, inefficient

### 3. Secrets: Environment Variables vs Secrets Manager

**Decision:** Replace hardcoded values in wrangler.jsonc with descriptive placeholder comments and document `wrangler secret put` commands. Use `wrangler.secret` CLI for production.

**Rationale:**
- Cloudflare Workers supports secret storage natively
- No external secrets manager needed
- Alternative: dotenv files — not supported by Cloudflare Workers deployment

### 4. Bulk Assign: Fetch Agents in Tickets Page

**Decision:** Fetch agents from `GET /api/agents` in the Tickets page and pass to BulkActionBar.

**Rationale:**
- Simple prop pass, minimal change
- Alternative: have BulkActionBar fetch agents internally — breaks component isolation

### 5. Live Call: Save Call Record

**Decision:** In the Live Call `onSave` handler, call both `POST /api/tickets` (existing) and `POST /api/calls` (new) with call metadata (transcript, duration from SpeechRecognition timestamps).

**Rationale:**
- Live Call already has transcript and timing data from Web Speech API
- Minimal addition to existing save flow
- Alternative: auto-create call record on ticket creation via webhook — over-engineering

### 6. CustomerDetail Edit: Inline Dialog

**Decision:** Add an "Edit" button to CustomerDetails that opens a dialog pre-filled with customer data. Uses existing `PATCH /api/customers/:id` endpoint.

**Rationale:**
- Reuses existing CreateTicketDialog pattern (dialog + form)
- Consistent with other settings pages that use dialogs

### 7. 404 Page: Simple Component

**Decision:** Create a simple `NotFound` component with VoxCare branding, "Return to Dashboard" button, and a link to report a broken link.

**Rationale:**
- Replaces silent redirect — gives user feedback
- Alternative: keep redirect — no user feedback, confusing UX

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| SSE hook connects on every page load | Extra server connection per user | Hook already has exponential backoff; single connection per tab |
| Analytics range filter breaks for old data | Returns empty results if no data in range | Show "No data for selected range" message |
| Removing hardcoded secrets breaks local dev | Need to set secrets locally before first run | Document `JWT_SECRET` in README; keep dev defaults |
| CustomerDetail edit dialog adds complexity | One more form to maintain | Small, straightforward form — low maintenance burden |
