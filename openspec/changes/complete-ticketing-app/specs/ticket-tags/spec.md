## ADDED Requirements

### Requirement: Ticket tags
Tickets SHALL have an optional array of freeform string tags (`tags: string[]`). Tags SHALL be creatable, editable, and removable on the ticket detail page and during ticket creation/editing. Tag input SHALL provide autocomplete suggestions from all existing tags in the system.

#### Scenario: Add tag to ticket
- **WHEN** an agent types "billing" in the tag input on a ticket
- **THEN** the tag is added to the ticket's tags array and appears as a removable chip

#### Scenario: Autocomplete suggests existing tags
- **WHEN** an agent starts typing a tag name
- **THEN** the system suggests previously used tags that match the partial input

### Requirement: Filter tickets by tag
The ticket list page SHALL allow filtering by one or more tags. Multiple tags SHALL be combined with OR logic (show tickets that have ANY of the selected tags).

#### Scenario: Filter by single tag
- **WHEN** a user selects the "billing" tag filter
- **THEN** the ticket list shows only tickets tagged with "billing"

#### Scenario: Filter by multiple tags
- **WHEN** a user selects both "billing" and "bug-report" tag filters
- **THEN** the ticket list shows tickets that have either "billing" OR "bug-report" tags

### Requirement: Tag analytics
The analytics page SHALL display a breakdown of tickets by tag, showing count and percentage for each tag over the selected date range.

#### Scenario: View tag breakdown in analytics
- **WHEN** a supervisor opens the analytics page
- **THEN** they see a chart showing ticket distribution by tag for the selected period

### Requirement: Remove tag from ticket
Agents SHALL remove individual tags from a ticket without affecting other tags. The action SHALL be logged in the audit trail.

#### Scenario: Remove tag
- **WHEN** an agent clicks the X on a "billing" tag chip
- **THEN** the tag is removed from the ticket and the audit log records the change
