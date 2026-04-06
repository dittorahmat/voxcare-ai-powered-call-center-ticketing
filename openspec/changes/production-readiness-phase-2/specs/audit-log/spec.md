## ADDED Requirements

### Requirement: Audit Log Storage
The system SHALL store audit entries in the AppController Durable Object. Each audit entry SHALL include: `id`, `action` (created/updated/deactivated/deleted/assigned/resolved), `userId`, `userName`, `userRole`, `entityType` (ticket/user/customer/settings), `entityId`, `timestamp`, `changes` (before/after diff), `ipAddress`.

#### Scenario: Ticket update is audited
- **WHEN** an agent updates a ticket's status from "open" to "resolved"
- **THEN** an audit entry is created with action "resolved", entityType "ticket", and the change diff

#### Scenario: User deactivation is audited
- **WHEN** an admin deactivates a user
- **THEN** an audit entry is created with action "deactivated" and entityType "user"

### Requirement: Audit Log API Endpoint
The system SHALL expose `GET /api/audit?page=&limit=&entityType=&entityId=&userId=&dateFrom=&dateTo=` for querying the audit log. Access SHALL be restricted to supervisor+ roles. The response SHALL be paginated.

#### Scenario: Supervisor queries audit log
- **WHEN** a supervisor requests `GET /api/audit?entityType=ticket&dateFrom=2025-01-01`
- **THEN** all ticket-related audit entries since Jan 1, 2025 are returned

### Requirement: Audit Log Auto-Cleanup
The audit log SHALL automatically remove the oldest entries when the total exceeds a configurable cap (default: 10,000 entries). The cap SHALL be configurable via system settings. Entries SHALL be removed in FIFO order.

#### Scenario: Audit log exceeds cap
- **WHEN** the audit log reaches 10,001 entries
- **THEN** the oldest entry is automatically removed

### Requirement: Activity Timeline on Ticket Detail
The ticket detail page SHALL display an extended activity timeline showing all audit entries for that ticket, sorted chronologically. Each entry SHALL show the action, user, timestamp, and any changed fields with before/after values.

#### Scenario: Viewing ticket activity timeline
- **WHEN** a user views a ticket that has been updated multiple times
- **THEN** the timeline shows all changes in chronological order with before/after values
