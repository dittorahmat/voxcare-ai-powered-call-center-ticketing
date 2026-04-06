## ADDED Requirements

### Requirement: Category-to-skills mapping configuration
Admins SHALL configure a mapping from ticket categories to required agent skills in system settings. Each category maps to a list of skills. An empty skill list means any agent can handle tickets in that category.

#### Scenario: Configure skills mapping
- **WHEN** an admin maps "technical-support" category to skills ["technical", "networking"]
- **THEN** the mapping is saved and used during ticket assignment

#### Scenario: Category with no skill requirement
- **WHEN** an admin maps "general-inquiry" category to an empty skill list []
- **THEN** any available agent can be assigned general inquiry tickets

### Requirement: Skills-based ticket assignment
When a ticket is created or manually assigned, the system SHALL first attempt to find an available agent whose `skills[]` array includes at least one skill from the ticket's category mapping. If a match is found, the ticket is assigned using round-robin among matching agents. If no match is found, the system falls back to round-robin among all available agents.

#### Scenario: Ticket assigned to skilled agent
- **WHEN** a "technical-support" ticket is created and agents A (skills: ["technical"]) and B (skills: ["billing"]) are available
- **THEN** the ticket is assigned to agent A

#### Scenario: Fallback to round-robin when no skill match
- **WHEN** a "technical-support" ticket is created and no available agent has matching skills
- **THEN** the ticket is assigned via round-robin among all available agents

#### Scenario: No available agents
- **WHEN** a ticket is created and no agents are available
- **THEN** the ticket remains unassigned and appears in the unassigned queue

### Requirement: Skills mapping used in manual assignment
When a supervisor manually assigns a ticket, the system SHALL suggest agents with matching skills first, followed by other available agents.

#### Scenario: Manual assignment with skill suggestions
- **WHEN** a supervisor opens the assign dialog for a "technical-support" ticket
- **THEN** agents with matching skills appear at the top of the suggestion list
