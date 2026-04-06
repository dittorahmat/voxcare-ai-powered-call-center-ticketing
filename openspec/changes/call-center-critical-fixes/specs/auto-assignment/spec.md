## ADDED Requirements

### Requirement: Round-Robin Auto-Assignment on Ticket Creation
When a new ticket is created, the system SHALL automatically assign it to the next available agent using round-robin algorithm: (1) filter agents where `availability === 'available'`, (2) sort by `lastAssignedAt` ascending, (3) assign to the first agent, (4) update `lastAssignedAt` and set `availability === 'busy'`. If no agent is available, the ticket SHALL remain unassigned and appear in the unassigned queue.

#### Scenario: Ticket assigned to available agent
- **WHEN** a new ticket is created and Agent A is the next in round-robin order
- **THEN** the ticket's `assignedTo` is set to Agent A's ID

#### Scenario: No agents available
- **WHEN** a new ticket is created and all agents are offline or on break
- **THEN** the ticket remains unassigned (`assignedTo: null`)
