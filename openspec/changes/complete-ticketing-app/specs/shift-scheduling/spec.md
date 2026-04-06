## ADDED Requirements

### Requirement: Shift schedule management
Admins SHALL create and manage weekly shift schedules. A shift defines: day of week, start time, end time, and assigned agents. Agents SHALL see their upcoming shifts on their profile page. Supervisors SHALL see a coverage heatmap showing agent count per time slot.

#### Scenario: Create weekly schedule
- **WHEN** an admin creates shifts for the week with agent assignments
- **THEN** the schedule is saved and agents see their assigned shifts

#### Scenario: Agent views their shifts
- **WHEN** an agent opens their profile page
- **THEN** they see their upcoming shifts for the current week

#### Scenario: Supervisor views coverage heatmap
- **WHEN** a supervisor opens the shift schedule page
- **THEN** they see a heatmap showing how many agents are scheduled per time slot, with gaps highlighted

### Requirement: Shift schedule stored per week
Schedules SHALL be stored per calendar week (ISO week number + year). Admins SHALL edit future weeks without affecting current or past weeks.

#### Scenario: Edit next week's schedule
- **WHEN** an admin edits the schedule for next week
- **THEN** only next week's schedule is modified; this week's schedule remains unchanged

### Requirement: Coverage gap alert
The system SHALL identify and display coverage gaps — time slots where no agents are scheduled during configured working hours.

#### Scenario: Coverage gap detected
- **WHEN** no agents are scheduled for Wednesday 14:00-16:00 during working hours
- **THEN** the gap is highlighted in the coverage heatmap

### Requirement: System timezone for shifts
All shift times SHALL be in the system timezone configured in system settings.

#### Scenario: Shift times in system timezone
- **WHEN** the system timezone is set to "Asia/Jakarta"
- **THEN** all shift start/end times are interpreted as Asia/Jakarta time
