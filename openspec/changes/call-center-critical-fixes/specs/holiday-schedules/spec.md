## ADDED Requirements

### Requirement: Holiday Schedule Management
Admin users SHALL configure holidays (date + name) via a Settings page. On holidays, SLA timers SHALL be paused — no SLA time accumulates. Holidays SHALL be stored as `{ id, date, name, createdAt }`.

#### Scenario: SLA paused on holiday
- **WHEN** a holiday is configured for December 25th and current time is December 25th
- **THEN** SLA timers show paused status and no time accumulates

#### Scenario: Admin adds holiday
- **WHEN** an admin adds a new holiday via Settings
- **THEN** existing SLA timers recalculate to account for the new holiday
