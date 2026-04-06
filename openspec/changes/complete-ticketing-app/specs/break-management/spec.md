## ADDED Requirements

### Requirement: Agent break logging
Agents SHALL toggle break status from the sidebar availability selector. When going on break, the agent SHALL select a reason (lunch, personal, training, other). Break start time, end time, reason, and duration SHALL be logged.

#### Scenario: Agent starts break
- **WHEN** an agent selects "break" status and chooses "lunch" as reason
- **THEN** a break log entry is created with start time and reason

#### Scenario: Agent ends break
- **WHEN** an agent changes status from break to available/busy
- **THEN** the break log entry is updated with end time and calculated duration

### Requirement: Break visibility on agent queue dashboard
The Agent Queue dashboard SHALL display current break status and break duration for each agent. Supervisors SHALL see how long each agent has been on break.

#### Scenario: Supervisor sees break duration
- **WHEN** a supervisor views the Agent Queue dashboard
- **THEN** agents on break show their break reason and elapsed duration (e.g., "Lunch — 12 min")

### Requirement: Break audit logging
All break start and end events SHALL be recorded in the audit log with agent name, reason, and timestamp.

#### Scenario: Break event logged
- **WHEN** an agent starts a break
- **THEN** an audit entry is created with the agent name, break reason, and timestamp

### Requirement: Extended availability states
The agent availability enum SHALL include: `available`, `busy`, `break`, `lunch`, `offline`. Agents SHALL select their status from the sidebar selector. The `break` status is a generic break; `lunch` is specifically for lunch breaks.

#### Scenario: Agent sets lunch status
- **WHEN** an agent selects "Lunch" from the availability dropdown
- **THEN** their status is set to `lunch` and a break log entry is created with reason "lunch"

#### Scenario: Agent sets generic break
- **WHEN** an agent selects "Break" from the availability dropdown
- **THEN** a dialog prompts for break reason before status is updated
