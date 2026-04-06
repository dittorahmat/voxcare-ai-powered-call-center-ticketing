## ADDED Requirements

### Requirement: SLA Configuration Management
The system SHALL allow admin users to define SLA rules per ticket priority level. Each SLA rule SHALL specify: `responseMinutes` (time to first response), `resolutionMinutes` (time to full resolution), and `escalationMinutes` (time before automatic escalation). Default rules SHALL be seeded on system initialization.

#### Scenario: Admin creates an SLA rule for urgent tickets
- **WHEN** an admin sets responseMinutes=15, resolutionMinutes=120, escalationMinutes=30 for priority `urgent`
- **THEN** all new urgent tickets receive these SLA deadlines upon creation

#### Scenario: Default SLA rules are seeded on startup
- **WHEN** the system starts with no existing SLA configurations
- **THEN** default rules are created: low (480/1440/960), medium (240/720/480), high (60/240/120), urgent (15/120/30)

### Requirement: Automatic SLA Record Creation
The system SHALL automatically create an `SLARecord` for every new ticket based on the matching SLA rule for that ticket's priority. The SLA record SHALL include `responseDeadline`, `resolutionDeadline`, and initial `escalationLevel: 0`.

#### Scenario: New urgent ticket receives SLA record
- **WHEN** a ticket is created with priority `urgent`
- **THEN** an SLA record is created with responseDeadline = now + 15 minutes and resolutionDeadline = now + 120 minutes

#### Scenario: Ticket without matching SLA rule
- **WHEN** a ticket is created with a priority that has no configured SLA rule
- **THEN** the ticket is created without an SLA record and a warning is logged

### Requirement: SLA Breach Detection
The system SHALL evaluate SLA records on ticket access and on periodic intervals. A breach SHALL be detected when the current time exceeds `responseDeadline` without a `firstResponseAt` value, or exceeds `resolutionDeadline` without a `resolvedAt` value. Breached records SHALL set `breached: true` and trigger an `sla-breached` notification.

#### Scenario: Response SLA is breached
- **WHEN** an urgent ticket is accessed and 20 minutes have passed without a first response
- **THEN** the SLA record is marked as breached and a notification is sent

#### Scenario: Resolution SLA is met
- **WHEN** a ticket is resolved before the resolution deadline
- **THEN** the SLA record records `resolvedAt` and is not marked as breached

### Requirement: Automatic Escalation
The system SHALL escalate a ticket when the `escalationMinutes` threshold is exceeded without resolution. Escalation SHALL increment the `escalationLevel` and notify the next tier of users (agent → supervisor → admin). Escalation SHALL continue at each interval until the ticket is resolved.

#### Scenario: Ticket escalates from agent to supervisor
- **WHEN** an urgent ticket exceeds 30 minutes without resolution
- **THEN** the escalation level increments and the assigned supervisor receives an escalation notification

#### Scenario: Ticket escalates from supervisor to admin
- **WHEN** the same urgent ticket exceeds 60 minutes without resolution
- **THEN** the escalation level increments again and an admin receives an escalation notification

### Requirement: SLA Compliance Reporting
The system SHALL compute an SLA compliance rate: the percentage of tickets resolved within their SLA deadlines over a given time period. This metric SHALL be available via the analytics endpoint and displayed on the analytics dashboard.

#### Scenario: Computing SLA compliance for the last 7 days
- **WHEN** a supervisor requests SLA compliance for the past week
- **THEN** the system returns the percentage of tickets resolved within SLA deadlines

### Requirement: SLA Countdown Display
The frontend SHALL display SLA countdown timers on ticket detail views and the ticket list. Timers SHALL show remaining time in a human-readable format (e.g., "23m remaining") and change color as the deadline approaches (green > 50%, yellow 10-50%, red < 10%, flashing on breach).

#### Scenario: SLA timer shows green with plenty of time
- **WHEN** a ticket has 80% of its SLA time remaining
- **THEN** the timer displays in green

#### Scenario: SLA timer flashes on breach
- **WHEN** a ticket's SLA deadline has passed
- **THEN** the timer displays in red with a flashing indicator
