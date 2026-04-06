## ADDED Requirements

### Requirement: Extended Agent Availability States
The `availability` field on User SHALL expand to: `available`, `busy`, `break`, `lunch`, `offline`. Agents SHALL set their own status via the UI. The auto-assignment algorithm SHALL only assign tickets to agents with `available` status. `break` and `lunch` SHALL NOT receive auto-assigned tickets.

#### Scenario: Agent goes on break
- **WHEN** an agent sets their status to `break`
- **THEN** they are excluded from auto-assignment until status returns to `available`

#### Scenario: Agent returns from break
- **WHEN** an agent changes status from `break` to `available`
- **THEN** they re-enter the round-robin pool for auto-assignment
