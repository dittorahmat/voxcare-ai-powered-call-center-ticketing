## ADDED Requirements

### Requirement: SLA Auto-Creation on Ticket Creation
When a new ticket is created via any channel (API, email, manual), the system SHALL automatically create an SLARecord based on the ticket's priority and the matching SLAConfig. The SLA record SHALL have `responseDeadline` and `resolutionDeadline` computed from the SLA config's minutes.

#### Scenario: Manual ticket creation creates SLA
- **WHEN** an agent creates a ticket with priority `high`
- **THEN** an SLA record is created with deadlines computed from the `high` priority SLA config

#### Scenario: Email-to-ticket creates SLA
- **WHEN** a ticket is auto-created from an inbound email with priority `urgent`
- **THEN** an SLA record is created with the urgent SLA deadlines
