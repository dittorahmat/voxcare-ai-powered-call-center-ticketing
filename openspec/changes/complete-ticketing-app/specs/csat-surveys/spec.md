## ADDED Requirements

### Requirement: CSAT survey on ticket resolution
When a ticket status changes to `resolved`, the system SHALL send an email to the customer with a CSAT survey link. The survey SHALL consist of a 1-5 star rating and an optional comment field. The survey link SHALL point to the public ticket view with the survey form pre-loaded.

#### Scenario: CSAT email sent on resolution
- **WHEN** an agent resolves a ticket
- **THEN** the customer receives an email with a star rating survey link

#### Scenario: Customer submits CSAT rating
- **WHEN** a customer clicks the survey link and selects 4 stars with an optional comment
- **THEN** the response is saved and associated with the ticket

#### Scenario: Customer views ticket without submitting CSAT
- **WHEN** a customer opens the public ticket view but closes it without rating
- **THEN** no CSAT response is recorded and the survey remains available

### Requirement: CSAT response storage
CSAT responses SHALL be stored in a `csatResponses` map with fields: `{ id, ticketId, rating (1-5), comment, submittedAt, customerEmail }`. Responses older than 90 days SHALL be eligible for auto-cleanup.

#### Scenario: Store CSAT response
- **WHEN** a customer submits a CSAT survey
- **THEN** the response is stored with rating, comment, timestamp, and email

#### Scenario: Duplicate CSAT submission blocked
- **WHEN** a customer tries to submit a second CSAT response for the same ticket
- **THEN** the system rejects the duplicate and shows their previous response

### Requirement: CSAT analytics dashboard
The Analytics page SHALL display: average CSAT score (overall and per agent), CSAT response rate (% of resolved tickets with responses), CSAT trend over time (line chart), and a table of recent responses with ticket links.

#### Scenario: View CSAT dashboard
- **WHEN** a supervisor opens the Analytics page
- **THEN** they see average CSAT score, response rate, trend chart, and recent responses

#### Scenario: Filter CSAT by date range
- **WHEN** a supervisor selects a 30-day date range on analytics
- **THEN** CSAT metrics update to show data for that period only

### Requirement: CSAT reminder email
If a customer has not submitted a CSAT response within 24 hours of ticket resolution, the system SHALL send one reminder email with the survey link. Only one reminder SHALL be sent per ticket.

#### Scenario: CSAT reminder sent after 24 hours
- **WHEN** 24 hours pass without a CSAT response for a resolved ticket
- **THEN** a reminder email is sent to the customer with the survey link

#### Scenario: No reminder if already responded
- **WHEN** a customer has already submitted their CSAT response
- **THEN** no reminder email is sent
