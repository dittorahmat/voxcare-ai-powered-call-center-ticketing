## ADDED Requirements

### Requirement: Agent Queue Dashboard
Supervisors and admins SHALL view a real-time dashboard at `/admin/queue` showing all agents with: name, avatar/initials, availability status (with color coding), active ticket count, last assigned time, and total tickets resolved today. The dashboard SHALL refresh automatically every 30 seconds.

#### Scenario: Supervisor views agent queue
- **WHEN** a supervisor navigates to `/admin/queue`
- **THEN** a table shows all agents with their current status and workload

#### Scenario: Agent status updates in real-time
- **WHEN** an agent changes their status from `available` to `break`
- **THEN** the dashboard reflects the change within 30 seconds
