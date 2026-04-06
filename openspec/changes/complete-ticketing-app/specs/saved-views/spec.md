## ADDED Requirements

### Requirement: Per-user saved ticket views
Each user SHALL create, edit, and delete saved ticket views. A view stores a name, filter set (status, priority, assignee, tags, date range, search query, SLA status), sort order, and a flag indicating whether it is a system default. System defaults (userId: "system") are visible to all users. Personal views are visible only to their owner.

#### Scenario: Agent creates personal view
- **WHEN** an agent filters tickets by "My Open High-Priority" and clicks "Save View"
- **THEN** the view is saved under their user ID and appears in their sidebar

#### Scenario: System default visible to all
- **WHEN** a new user logs in
- **THEN** they see system default views like "All Open", "Unassigned", "SLA Breached" in their sidebar

#### Scenario: Delete personal view
- **WHEN** a user deletes their saved view
- **THEN** the view is removed from their sidebar and no other users are affected

### Requirement: Apply saved view
Clicking a saved view SHALL apply its stored filters and sort to the ticket list page, replacing any current filters.

#### Scenario: Apply saved view
- **WHEN** a user clicks their "My Open Tickets" saved view
- **THEN** the ticket list updates to show only their open tickets, sorted by priority

### Requirement: Share saved view (future enhancement placeholder)
The system SHALL reserve the capability for users to share saved views with other users or all users. The data model SHALL include a `sharedWith: string[] | "all"` field on SavedView.

#### Scenario: Share view with all users (future)
- **WHEN** a supervisor shares their view with all users
- **THEN** the view becomes visible to all users as a shared view (not system default)
