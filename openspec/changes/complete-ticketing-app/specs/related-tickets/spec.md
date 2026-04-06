## ADDED Requirements

### Requirement: Link tickets as related or parent-child
Agents SHALL link tickets together with a relationship type: `parent-child` or `related`. Relationships SHALL be stored in a separate `ticketRelations` map and displayed bidirectionally on the ticket detail page.

#### Scenario: Create parent-child relationship
- **WHEN** an agent links ticket B as a child of ticket A
- **THEN** ticket A shows B as a child, and ticket B shows A as the parent

#### Scenario: Create related relationship
- **WHEN** an agent marks tickets A and B as related
- **THEN** both tickets display each other in the "Related Tickets" section

### Requirement: Related tickets panel on ticket detail
The ticket detail page SHALL display a "Related Tickets" panel showing all linked tickets with their status, priority, title, and relationship type. Clicking a related ticket SHALL navigate to that ticket.

#### Scenario: View related tickets
- **WHEN** an agent opens a ticket with linked relations
- **THEN** they see a panel listing all related tickets with status badges and relationship type labels

#### Scenario: Navigate to related ticket
- **WHEN** an agent clicks a related ticket in the panel
- **THEN** they are navigated to that ticket's detail page

### Requirement: Unlink tickets
Agents with supervisor or admin role SHALL remove a relationship between two tickets. The unlink action SHALL delete the relation entry from `ticketRelations` and update both tickets' related panels.

#### Scenario: Unlink related tickets
- **WHEN** a supervisor clicks "Unlink" on a ticket relation
- **THEN** the relation is removed and both tickets no longer show each other as related
