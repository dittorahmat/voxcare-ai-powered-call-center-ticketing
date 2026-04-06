## ADDED Requirements

### Requirement: Ticket Re-open
The TicketStatus type SHALL include `reopened` in addition to `open`, `in-progress`, and `resolved`. Agents SHALL re-open resolved tickets via a "Re-open" button on the ticket detail page. Re-opened tickets SHALL have their SLA clock resumed from where it left off.

#### Scenario: Agent re-opens resolved ticket
- **WHEN** an agent clicks "Re-open" on a resolved ticket
- **THEN** the ticket status changes to `reopened` and it appears in the open tickets queue

#### Scenario: Incoming email re-opens resolved ticket
- **WHEN** a customer replies via email to a resolved ticket
- **THEN** the ticket status is automatically set to `reopened` and a new SLA timer starts
