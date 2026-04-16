## ADDED Requirements

### Requirement: Supervisor can add coaching notes to agents
Supervisors and admins SHALL add private coaching notes to individual agents, optionally linked to a specific ticket.

#### Scenario: Supervisor adds general coaching note
- **WHEN** supervisor adds note "Great tone on difficult tickets, work on resolution speed" to Agent B
- **THEN** the coaching note is saved with supervisor ID, agent ID, text, timestamp, and no ticket link

#### Scenario: Supervisor adds ticket-linked coaching note
- **WHEN** supervisor adds note "Should have verified customer identity first" to Agent B linked to ticket T-1001
- **THEN** the coaching note is saved with the ticket ID reference

### Requirement: Agents can view their coaching notes
Agents SHALL see their own coaching notes (read-only), sorted by most recent.

#### Scenario: Agent views coaching history
- **WHEN** agent navigates to their coaching page
- **THEN** they see all coaching notes from supervisors, most recent first, with ticket links where applicable

### Requirement: Coaching notes stored in AppController DO
Coaching notes SHALL be stored in the AppController DO with fields: id, agentId, supervisorId, ticketId (optional), text, createdAt.

#### Scenario: Coaching note retrieved
- **WHEN** agent coaching endpoint is called
- **THEN** all coaching notes for that agent are returned, sorted by createdAt descending
