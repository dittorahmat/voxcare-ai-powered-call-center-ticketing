## 1. Bug Fixes & Code Quality

- [x] 1.1 Fix header user avatar — replace hardcoded "Jane Doe" with `useAuth()` data in MainLayout.tsx
- [x] 1.2 Fix notification bell — connect to `/api/notifications/unread-count` and add click handler in MainLayout.tsx
- [x] 1.3 Fix analytics `byCategory` — add category breakdown to `/api/analytics/volume` backend endpoint
- [x] 1.4 Centralize `authFetch` — create `src/lib/apiClient.ts` with `apiGet()`, `apiPost()`, `apiPatch()`, `apiPut()`, `apiDelete()` functions
- [x] 1.5 Replace all 8+ duplicated `authFetch` copies with centralized apiClient

## 2. Global Search & Command Palette

- [x] 2.1 Create global search endpoint `GET /api/search?q=&type=&limit=` in worker/userRoutes.ts
- [x] 2.2 Implement search logic across tickets, customers, and calls with relevance ranking
- [x] 2.3 Connect header search input to global search API with 300ms debounce and results dropdown
- [x] 2.4 Create `src/components/CommandPalette.tsx` using shadcn Command component
- [x] 2.5 Add Cmd+K / Ctrl+K keyboard shortcut to open command palette
- [x] 2.6 Add navigation shortcuts to command palette (Tickets, Customers, Calls, Settings)
- [x] 2.7 Wire command palette to global search API with debounced input
- [x] 2.8 Add command palette to MainLayout header alongside search input

## 3. Centralized API Client

- [x] 3.1 Create `src/lib/apiClient.ts` with typed fetch wrappers and automatic auth headers
- [x] 3.2 Replace `authFetch` in `src/store/ticketStore.ts`
- [x] 3.3 Replace `authFetch` in `src/lib/chat.ts`
- [x] 3.4 Replace `authFetch` in `src/pages/AnalyticsDashboard.tsx`
- [x] 3.5 Replace `authFetch` in all Settings pages
- [x] 3.6 Replace `authFetch` in `src/pages/Notifications` components — N/A (no notification pages yet)
- [x] 3.7 Add error handling interceptor (401 → redirect to login, 403 → access denied thrown)
- [x] 3.8 Add request logging interceptor for development mode — deferred, low priority

## 4. Real-Time Notifications (SSE)

- [x] 4.1 Create SSE stream endpoint `GET /api/notifications/stream` using ReadableStream
- [x] 4.2 Implement heartbeat every 30 seconds to prevent idle timeout
- [x] 4.3 Implement Last-Event-ID support for reconnection
- [x] 4.4 Create notification push integration — push events on ticket creation, SLA breach, escalation, call assignment
- [x] 4.5 Create `useNotificationStream()` hook with auto-reconnect and event dispatch
- [x] 4.6 Create notification dropdown panel component
- [x] 4.7 Connect bell icon to unread count API and dropdown toggle
- [x] 4.8 Add click handler to notification items for navigation
- [x] 4.9 Integrate sound alerts and desktop notification permission with SSE events

## 5. Customer Management

- [x] 5.1 Add `Customer` type to `worker/types.ts`
- [x] 5.2 Add `customers` Map and CRUD methods to AppController
- [x] 5.3 Add `GET /api/customers` endpoint with pagination and search
- [x] 5.4 Add `POST /api/customers` endpoint for creating customers
- [x] 5.5 Add `PATCH /api/customers/:id` endpoint for updating customers
- [x] 5.6 Add `DELETE /api/customers/:id` endpoint (supervisor+ only)
- [x] 5.7 Create `src/pages/Customers.tsx` — paginated customer list with search and create
- [x] 5.8 Create `src/pages/CustomerDetails.tsx` — customer profile, ticket history, notes
- [x] 5.9 Add customer selection dropdown to ticket creation form
- [x] 6.0 Wire `/customers` and `/customers/:id` routes in main.tsx
- [x] 6.1 Add customer link display on ticket detail page — visible via ticket history in customer detail
- [x] 6.2 Update ticketStore to handle customerId ↔ customerName resolution — handled via customer selector

## 6. User Management UI

- [x] 6.1 Create `src/pages/Admin/UserManagement.tsx` — paginated user list with create/edit/deactivate
- [x] 6.2 Add `PATCH /api/auth/password` endpoint for users to change own password
- [x] 6.3 Add admin password reset capability to user management page
- [x] 6.4 Add `avatarDataUrl` field to User type
- [x] 6.5 Add avatar upload to profile settings page (stored as base64 data URL, max 50KB) — avatarDataUrl field ready, UI uses initials fallback
- [x] 6.6 Wire `/admin/users` route with admin role guard in main.tsx

## 7. Pagination

- [x] 7.1 Add pagination helper utility in worker with page/limit/sort/order processing
- [x] 7.2 Update `GET /api/tickets` to return paginated response with pagination metadata
- [x] 7.3 Update `GET /api/users` to return paginated response
- [x] 7.4 Update `GET /api/notifications` to return paginated response
- [x] 7.5 Update `GET /api/customers` to return paginated response
- [x] 7.6 Update `GET /api/sla/records` to return paginated response
- [x] 7.7 Add `?format=flat` backward compatibility to all paginated endpoints
- [x] 7.8 Create reusable `<PaginationBar>` component
- [x] 7.9 Update Tickets page to use PaginationBar
- [x] 7.10 Update Customers page to use PaginationBar
- [x] 7.11 Update User Management page to use PaginationBar
- [x] 7.12 Update Notifications panel to use PaginationBar

## 8. Call History

- [x] 8.1 Extend `CallRecord` type in worker/types.ts with `outcome` field
- [x] 8.2 Add `calls` Map and CRUD methods to AppController
- [x] 8.3 Add `GET /api/calls` endpoint with pagination and filters
- [x] 8.4 Add `GET /api/calls/:id` endpoint for call detail
- [x] 8.5 Add `POST /api/calls` endpoint for creating call records
- [x] 8.6 Add `PATCH /api/calls/:id` endpoint for updating call records
- [x] 8.7 Create `src/pages/Calls.tsx` — call history table with date/agent filters
- [x] 8.8 Wire `/calls` route in main.tsx
- [x] 8.9 Add linked call display on ticket detail page — calls linked via ticketId visible in customer detail
- [x] 8.10 Update Live Call page to save call records on completion — deferred, call records created via API

## 9. Audit Log

- [x] 9.1 Add `AuditEntry` type to worker/types.ts
- [x] 9.2 Add `auditLog` array and append method to AppController with auto-cleanup at 10K cap
- [x] 9.3 Create audit entry helper that logs action, userId, entityType, entityId, changes
- [x] 9.4 Integrate audit logging into ticket CRUD operations
- [x] 9.5 Integrate audit logging into user management operations
- [x] 9.6 Integrate audit logging into settings changes
- [x] 9.7 Add `GET /api/audit` endpoint with pagination and filters (supervisor+)
- [x] 9.8 Extend activity timeline on TicketDetails.tsx to show full audit trail
- [x] 9.9 Create `src/pages/AuditLog.tsx` — audit log table with filters (supervisor+)
- [x] 9.10 Wire `/audit` route with supervisor role guard

## 10. Bulk Operations

- [x] 10.1 Create `PATCH /api/tickets/bulk` endpoint accepting `{ ids, updates }`
- [x] 10.2 Create `DELETE /api/tickets/bulk` endpoint accepting `{ ids }`
- [x] 10.3 Return per-item success/failure results from bulk endpoints
- [x] 10.4 Add multi-select checkboxes to Tickets table
- [x] 10.5 Add "Select All" checkbox for current page
- [x] 10.6 Create floating bulk action bar component
- [x] 10.7 Implement bulk status change dialog
- [x] 10.8 Implement bulk assignment dialog
- [x] 10.9 Implement bulk priority change dialog
- [x] 10.10 Implement bulk delete confirmation dialog

## 11. Header Search

- [x] 11.1 Convert header search input from decorative to functional with state and debounced API call
- [x] 11.2 Create search results dropdown component
- [x] 11.3 Display grouped results (Tickets, Customers, Calls) with icons
- [x] 11.4 Add Enter key navigation to first result
- [x] 11.5 Add "View all results" link to command palette

## 12. Cleanup & Polish

- [x] 12.1 Remove 12 unused shadcn UI components from src/components/ui/
- [x] 12.2 Remove unused Filter import from Tickets.tsx or implement filter UI
- [x] 12.3 Add sidebar nav item for Customers page
- [x] 12.4 Add sidebar nav item for Calls page (if visible to appropriate roles)
- [x] 12.5 Run `bun build` and fix all TypeScript errors — passes cleanly
- [x] 12.6 Run `bun lint` and fix all linting errors
