## ADDED Requirements

### Requirement: Filter activity timeline by type
The activity timeline on the ticket detail page SHALL be filterable by event type: status change, note (internal/public), assignment, SLA event, email, attachment, merge, relation. Filters SHALL be applied client-side via checkbox toggles.

#### Scenario: Filter to show only SLA events
- **WHEN** an agent unchecks all event types except "SLA event" on the timeline filter
- **THEN** the timeline shows only SLA-related entries (deadlines, breaches, escalations)

#### Scenario: Filter to show only notes
- **WHEN** an agent selects only "note" in the timeline filter
- **THEN** the timeline shows only internal and public notes

#### Scenario: Show all event types
- **WHEN** an agent opens the activity timeline with no filters applied
- **THEN** all event types are visible by default

### Requirement: Activity filter state persistence
The filter state SHALL persist while the user is on the ticket detail page. Navigating away and back SHALL reset to showing all event types.

#### Scenario: Filter persists during session
- **WHEN** an agent filters the timeline and scrolls through entries
- **THEN** the filter selection is maintained until they navigate away

### Requirement: Activity filter shows count
The filter UI SHALL show the count of visible entries for each event type (e.g., "Status Changes (3)", "Notes (7)", "SLA Events (2)").

#### Scenario: Filter shows entry counts
- **WHEN** an agent opens the timeline filter
- **THEN** each event type shows how many entries match that type
