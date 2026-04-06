## ADDED Requirements

### Requirement: Business Hours SLA Calculation
SLA timers SHALL only count down during configured working hours (e.g., 08:00–18:00). Time outside working hours SHALL NOT count toward SLA deadlines. The SLA display SHALL show "effective remaining time" calculated by counting working minutes remaining, skipping non-working hours.

#### Scenario: SLA pauses outside working hours
- **WHEN** a ticket's SLA deadline falls at 17:00 and current time is 18:00 (after working hours)
- **THEN** the SLA timer shows paused status until the next working day at 08:00

#### Scenario: SLA respects working hours config
- **WHEN** working hours are changed from 08:00–18:00 to 09:00–17:00
- **THEN** existing SLA timers recalculate based on the new working hours
