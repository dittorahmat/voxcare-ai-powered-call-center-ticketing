## ADDED Requirements

### Requirement: Paginated List Endpoints
All list endpoints (`/api/tickets`, `/api/users`, `/api/notifications`, `/api/customers`, `/api/sla/records`, `/api/agents`) SHALL accept query parameters: `page` (default 1), `limit` (default 20, max 100), `sort` (field name), `order` (asc/desc). The response SHALL be wrapped as `{ success: true, data: [...], pagination: { total, page, limit, totalPages } }`.

#### Scenario: Default pagination on tickets
- **WHEN** a user requests `GET /api/tickets` with no params
- **THEN** the system returns the first 20 tickets sorted by creation date desc with pagination metadata

#### Scenario: Custom page and limit
- **WHEN** a user requests `GET /api/tickets?page=3&limit=10`
- **THEN** the system returns tickets 21-30 sorted by creation date desc

#### Scenario: Sorted results
- **WHEN** a user requests `GET /api/tickets?sort=priority&order=desc`
- **THEN** the system returns tickets sorted by priority (urgent first)

### Requirement: Frontend Pagination Controls
The frontend SHALL provide a reusable `<PaginationBar>` component that displays: current page info ("Showing 1-20 of 150"), page number buttons, prev/next buttons, and a page size selector (10, 20, 50, 100). All list pages (Tickets, Customers, Users, Notifications) SHALL use this component.

#### Scenario: Pagination bar on tickets page
- **WHEN** the tickets page loads with 150 total tickets
- **THEN** the pagination bar shows "Showing 1-20 of 150" with page numbers 1-8

#### Scenario: Changing page size
- **WHEN** a user changes the page size from 20 to 50
- **THEN** the system reloads with `?limit=50` and shows "Showing 1-50 of 150"

### Requirement: Backward Compatibility for Pagination
During a transition period, list endpoints SHALL support `?format=flat` query parameter that returns the legacy flat array format (no pagination wrapper). This enables gradual client migration.

#### Scenario: Legacy flat format request
- **WHEN** a client requests `GET /api/tickets?format=flat`
- **THEN** the system returns the raw array without pagination wrapper
