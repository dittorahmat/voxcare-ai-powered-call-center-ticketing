## ADDED Requirements

### Requirement: Agent Availability Management
The system SHALL track each agent's availability status: `available`, `busy`, or `offline`. Agents SHALL be able to manually set their status via the UI. The system SHALL automatically set status to `busy` when a ticket is assigned and to `available` when the ticket is resolved or reassigned.

#### Scenario: Agent sets status to offline
- **WHEN** an agent clicks "Go Offline" in the sidebar
- **THEN** the agent's status is updated to `offline` and they are excluded from routing

#### Scenario: Agent status auto-updates on ticket assignment
- **WHEN** a ticket is assigned to an available agent
- **THEN** the agent's status changes to `busy`

### Requirement: Round-Robin Ticket Assignment
The system SHALL assign tickets to agents using a round-robin algorithm that selects the available agent with the oldest `lastAssignedAt` timestamp. The algorithm SHALL respect agent availability and SHALL NOT assign tickets to offline agents.

#### Scenario: Round-robin assigns to next available agent
- **WHEN** a new ticket is created and three agents are available
- **THEN** the ticket is assigned to the agent who was assigned least recently

#### Scenario: No agents available
- **WHEN** a new ticket is created and all agents are offline or busy
- **THEN** the ticket remains unassigned and an alert is sent to supervisors

### Requirement: Skill-Based Routing
The system SHALL support skill-based routing where tickets are matched to agents based on ticket `category` and agent `skills`. When skill-based routing is enabled for a queue, the round-robin algorithm SHALL first filter agents by matching skill before applying round-robin selection.

#### Scenario: Technical ticket routed to skilled agent
- **WHEN** a ticket with category "Technical Support" is created
- **THEN** only agents with "Technical Support" in their skills are considered for assignment

#### Scenario: No matching skill available
- **WHEN** a ticket's category has no matching agent skills
- **THEN** the system falls back to standard round-robin among all available agents

### Requirement: Agent Queue Dashboard
The system SHALL provide a dashboard view showing all agents, their current status, active ticket count, and last activity timestamp. Supervisors and admins SHALL be able to manually reassign tickets from this view.

#### Scenario: Supervisor views agent queue
- **WHEN** a supervisor navigates to the agent queue dashboard
- **THEN** all agents are listed with their status, active tickets, and last activity time

#### Scenario: Manual ticket reassignment
- **WHEN** a supervisor reassigns a ticket from Agent A to Agent B
- **THEN** the ticket's `assignedTo` field is updated and both agents receive notifications

### Requirement: Call Queue Integration
The system SHALL integrate with the telephony call queue to display real-time queue status: number of waiting calls, average wait time, and longest wait. This data SHALL come from the telephony integration events.

#### Scenario: Supervisor views live call queue
- **WHEN** a supervisor views the call queue dashboard
- **THEN** waiting calls are listed with wait times and the caller's phone number (if available)

#### Scenario: Longest-wait call alert
- **WHEN** a call has been waiting for more than 5 minutes
- **THEN** an alert is displayed highlighting the longest-wait call
