## ADDED Requirements

### Requirement: Call Record Storage
The system SHALL store call records in the AppController Durable Object. Each call record SHALL include: `id`, `callId`, `callerNumber`, `agentId`, `ticketId`, `status` (ringing/active/hold/ended), `startedAt`, `endedAt`, `durationSeconds`, `transcript`, `outcome`.

#### Scenario: Call record is created
- **WHEN** a call starts via the telephony system or Live Call page
- **THEN** a call record is created with status "active" and `startedAt`

#### Scenario: Call record is finalized
- **WHEN** a call ends
- **THEN** the record's `endedAt`, `durationSeconds`, and status are updated

### Requirement: Call History Page
The frontend SHALL provide a `/calls` page with a paginated table showing: call ID, caller number (or "Web Intake"), assigned agent, linked ticket, duration, outcome, and date. The page SHALL include date range filters and agent filters.

#### Scenario: Viewing call history
- **WHEN** a user navigates to `/calls`
- **THEN** the call log table loads with pagination and filters

#### Scenario: Filtering calls by date range
- **WHEN** a user sets a date range and applies the filter
- **THEN** only calls within that date range are displayed

### Requirement: Call-Ticket Linking
Call records SHALL be linkable to tickets via `ticketId`. The ticket detail page SHALL show linked call records with duration and outcome. The customer detail page SHALL show all calls associated with that customer's tickets.

#### Scenario: Ticket shows linked call
- **WHEN** a ticket was created from a voice call
- **THEN** the ticket detail page shows the call duration and a link to the call record

### Requirement: Calls API Endpoints
The system SHALL expose:
- `GET /api/calls?page=&limit=&agentId=&dateFrom=&dateTo=` — paginated call list
- `GET /api/calls/:id` — single call detail
- `POST /api/calls` — create call record (telephony system or Live Call)
- `PATCH /api/calls/:id` — update call record (set outcome, link ticket)

#### Scenario: Querying calls by agent
- **WHEN** a supervisor requests `GET /api/calls?agentId=<userId>`
- **THEN** only calls handled by that agent are returned
