## Why

After completing the `harden-call-center-core` change (auth, SLA, analytics, settings), VoxCare has solid backend APIs but several critical gaps remain: functional UI bugs (dummy notification bell, hardcoded "Jane Doe" avatar, non-functional header search, broken analytics chart), missing customer management (no customer profiles or CRUD), incomplete notification UX (API exists but no SSE stream or dropdown panel), no user management UI despite admin API being complete, and no pagination on any list endpoint (performance risk at scale). This change closes all identified gaps to make VoxCare production-ready.

## What Changes

### Phase 1: Bug Fixes & Polish (Quick Wins)
- **Fix notification bell** — Connect to `/api/notifications/unread-count`, add click handler, add dropdown panel with recent notifications list
- **Fix header user avatar** — Replace hardcoded "Jane Doe" with `useAuth()` data (name, role, avatar initials)
- **Fix analytics `byCategory`** — Backend `/api/analytics/volume` must return category breakdown; frontend bar chart will display real data
- **Implement global header search** — Connect to ticket/customer search API, show dropdown results
- **Centralize `authFetch`** — Extract duplicated auth header helper into single `src/lib/apiClient.ts`, replace all 8+ copies

### Phase 2: Real-Time Notifications
- **SSE stream endpoint** — `GET /api/notifications/stream` with `ReadableStream` for server-sent events
- **Notification push integration** — Push events on ticket creation, SLA breach, escalation, call assignment
- **SSE client hook** — `useNotificationStream()` hook for subscription, auto-reconnect, event dispatch
- **Notification dropdown/inbox panel** — Click bell to see recent notifications, mark all read, click to navigate

### Phase 3: Customer Management
- **Customer data model** — New `Customer` type with profile info (name, email, phone, tags, VIP flag, notes)
- **Customer CRUD API** — `GET/POST/PATCH/DELETE /api/customers` with search and pagination
- **Customer page** — `/customers` list view with search, sort, create dialog
- **Customer detail page** — `/customers/:id` with profile, ticket history, contact info, notes
- **Link customers to tickets** — Ticket creation references customer by ID; ticket detail shows full customer profile

### Phase 4: User Management UI
- **User management page** — `/admin/users` with user list, create/edit/deactivate, role assignment
- **Password change** — Endpoint for users to change own password, admin can reset any user's password
- **Avatar/initials** — Generate from name or upload (stored as data URL)

### Phase 5: Pagination & Performance
- **Pagination API** — All list endpoints (`/api/tickets`, `/api/users`, `/api/notifications`, `/api/customers`, `/api/sla/records`) accept `?page=&limit=&sort=&order=` params and return `{ data, pagination: { total, page, limit, totalPages } }`
- **Frontend pagination controls** — Reusable `<PaginationBar>` component, update all list pages
- **Virtual scrolling** — Optional for large tables (Tickets, Customers)

### Phase 6: Call History & Activity Log
- **Call records API** — `GET /api/calls` with filters (date range, agent, customer), linked to tickets
- **Call history page** — `/calls` with call log table, duration, outcome, linked ticket
- **Activity/audit log** — Track who changed what on tickets, settings, users. `GET /api/audit` endpoint
- **Activity timeline** — Visible on ticket detail (extended beyond current static timeline)

### Phase 7: Bulk Operations
- **Bulk ticket operations** — `PATCH /api/tickets/bulk` for status change, assignment, priority update across multiple tickets
- **Bulk selection UI** — Checkbox selection on ticket table, bulk action bar

### Phase 8: Global Search
- **Global search API** — `GET /api/search?q=` returning results from tickets, customers, calls with ranked relevance
- **Command palette** — `Cmd+K` / `Ctrl+K` keyboard shortcut, searchable command menu (shadcn Command component)
- **Quick navigation** — Jump to ticket/customer/call directly from search

## Capabilities

### New Capabilities

- `customer-management`: Customer CRUD, profiles, ticket history linking, customer search and detail pages
- `real-time-notifications-sse`: SSE stream endpoint, notification push integration, client subscription hook, dropdown inbox panel
- `user-management-ui`: Admin user management page with create/edit/deactivate/role assignment, password change
- `pagination`: Paginated list endpoints with `page`, `limit`, `sort`, `order` params and frontend pagination controls
- `call-history`: Call records storage, call history page with linked tickets, duration and outcome tracking
- `audit-log`: Activity tracking for ticket changes, user actions, settings updates; audit log endpoint and timeline
- `bulk-operations`: Bulk ticket status change, assignment, priority update; multi-select UI with action bar
- `global-search`: Global search API across tickets/customers/calls, Cmd+K command palette, quick navigation

### Modified Capabilities

- `ticket-management`: Tickets now link to customers by ID (not just `customerName` string). List endpoint returns paginated results. Bulk operations added.
- `analytics-reporting`: `/api/analytics/volume` now includes `byCategory` breakdown. Analytics dashboard gains CSV export on all report types.
- `user-auth`: Adds password change endpoint (`PATCH /api/auth/password`). Adds avatar data URL field to User type.
- `real-time-notifications`: Extended to include SSE stream endpoint and client subscription hook (previously deferred).
- `settings-management`: Settings now include pagination preferences and search configuration.

## Impact

- **Frontend**: New pages (`/customers`, `/customers/:id`, `/calls`, `/admin/users`), command palette, notification dropdown, pagination controls, header search with results, fixed bell/avatar/analytics
- **Backend Worker**: New SSE endpoint, search endpoint, customer CRUD, call records CRUD, audit log endpoint, bulk ticket endpoint, pagination on all list endpoints, password change endpoint
- **Durable Objects**: AppController gains `customers`, `calls`, `auditLog` entity maps with persistence
- **Data Model**: New `Customer`, `CallRecord` (extended), `AuditEntry` types. Ticket gains `customerId` (replaces/augments `customerName`)
- **API Breaking**: All existing list endpoints now return `{ data, pagination }` wrapper instead of flat array. Clients must adapt to paginated response format.
- **Dependencies**: None new (all use existing stack: Hono, Cloudflare DO, React, Zustand, shadcn Command)
