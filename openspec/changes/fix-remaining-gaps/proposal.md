## Why

After completing two major changes (`harden-call-center-core` and `production-readiness-phase-2`), an audit revealed 11 remaining gaps in the application: a critical orphaned SSE hook (no real-time push notifications), a broken analytics range filter, hardcoded secrets in source control, and several medium/minor UX issues that degrade the production experience. This change closes every identified gap.

## What Changes

- **Wire `useNotificationStream` SSE hook** — Connect the existing SSE hook to MainLayout so users receive real-time push notifications instead of relying solely on 30-second polling
- **Fix analytics range filter** — Pass `?from=` and `?to=` query parameters to the analytics API when the user selects a date range
- **Secure wrangler.jsonc** — Replace hardcoded placeholder secrets with environment variable references; document `wrangler secret put` for production
- **Fix bulk assign** — Fetch agents from API and pass to BulkActionBar so the Assign button appears
- **Save call records from Live Call** — Call `POST /api/calls` when saving a ticket from the Live Call page
- **Fix Dashboard greeting** — Replace hardcoded "Welcome back, Jane" with authenticated user's name
- **Add Admin nav link** — Add sidebar navigation item for `/admin/users` (admin-only)
- **Add CustomerDetail edit** — Add edit button/dialog to customer detail page using existing `PATCH /api/customers/:id` endpoint
- **Add 404 page** — Replace silent wildcard redirect with a proper "Page Not Found" component
- **Move Settings to main nav** — Move Settings link from sidebar footer to the main navigation group

## Capabilities

### New Capabilities

- `sse-notifications`: Real-time push notifications via SSE stream, auto-reconnect, sound alerts, desktop notification triggers
- `404-handling`: Dedicated "Page Not Found" component with navigation links

### Modified Capabilities

- `analytics-reporting`: Range filter now actually filters data by passing `from` and `to` query parameters to the API
- `customer-management`: CustomerDetail page gains edit capability using existing PATCH endpoint
- `user-auth`: Admin users get sidebar navigation link to User Management page
- `settings-management`: Settings moved from sidebar footer to main navigation group for visibility
- `bulk-operations`: BulkActionBar now receives agents list, making the Assign button visible

## Impact

- **Frontend**: MainLayout (SSE hook, greeting fix, nav changes), AnalyticsDashboard (range filter fix), Dashboard (greeting), Tickets (agents fetch), LiveCall (call record save), CustomerDetails (edit dialog), new 404 page, sidebar nav changes
- **Backend**: No backend changes needed — all existing APIs already support the required functionality. Only frontend wiring is needed.
- **Security**: wrangler.jsonc secrets replaced with environment variable references; production deployment instructions updated
