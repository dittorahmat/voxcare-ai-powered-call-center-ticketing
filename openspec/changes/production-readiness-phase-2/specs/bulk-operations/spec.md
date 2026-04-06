## ADDED Requirements

### Requirement: Bulk Ticket Operations
The system SHALL expose `PATCH /api/tickets/bulk` accepting `{ ids: string[], updates: Partial<Ticket> }`. The endpoint SHALL apply the updates to all specified tickets and return a per-item result array: `[{ id, success, error? }]`. Supported bulk updates: status, assignedTo, priority, category.

#### Scenario: Bulk status update
- **WHEN** a supervisor sends `{ ids: ["T-1", "T-2", "T-3"], updates: { status: "resolved" } }`
- **THEN** all three tickets are updated to "resolved" and the response shows success for each

#### Scenario: Partial bulk update failure
- **WHEN** a bulk update includes a non-existent ticket ID
- **THEN** that item returns `{ id: "T-999", success: false, error: "Not found" }` while others succeed

### Requirement: Bulk Ticket Deletion
The system SHALL expose `DELETE /api/tickets/bulk` accepting `{ ids: string[] }`. The endpoint SHALL delete all specified tickets and return per-item results. Access SHALL be restricted to supervisor+ roles.

#### Scenario: Bulk delete tickets
- **WHEN** a supervisor sends `{ ids: ["T-1", "T-2"] }` to the bulk delete endpoint
- **THEN** both tickets are deleted and the response confirms each deletion

### Requirement: Bulk Selection UI
The Tickets page SHALL support multi-select mode: each row has a checkbox, a "Select All" checkbox in the header toggles selection for the current page, and a floating action bar appears when tickets are selected showing the count and available bulk actions (Change Status, Assign, Change Priority, Delete).

#### Scenario: Selecting multiple tickets
- **WHEN** a user checks 5 ticket checkboxes
- **THEN** a floating action bar appears showing "5 tickets selected" with bulk action buttons

#### Scenario: Bulk status change from action bar
- **WHEN** a user selects 5 tickets and clicks "Change Status → Resolved"
- **THEN** all 5 tickets are updated to resolved and the selection is cleared
