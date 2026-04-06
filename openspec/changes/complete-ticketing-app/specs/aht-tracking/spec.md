## ADDED Requirements

### Requirement: Average Handle Time tracking
The system SHALL calculate handle time for each resolved ticket as the difference between `resolvedAt` and `assignedAt` timestamps. The value SHALL be stored as `handleTimeSeconds` on the ticket. For unassigned tickets, handle time SHALL be calculated from creation to resolution.

#### Scenario: Handle time calculated on resolution
- **WHEN** a ticket assigned at 09:00 is resolved at 10:30
- **THEN** `handleTimeSeconds` is set to 5400 (90 minutes)

#### Scenario: Unassigned ticket handle time
- **WHEN** a ticket created at 09:00 and resolved at 09:45 was never assigned
- **THEN** `handleTimeSeconds` is set to 2700 (45 minutes from creation to resolution)

### Requirement: AHT in analytics
The Analytics page SHALL display: overall AHT (average across all resolved tickets), per-agent AHT, and AHT trend over the selected date range (daily average line chart).

#### Scenario: View overall AHT
- **WHEN** a supervisor opens the Analytics page
- **THEN** they see the overall AHT displayed as a stat card (e.g., "Avg Handle Time: 2h 15m")

#### Scenario: View per-agent AHT
- **WHEN** a supervisor views the agent performance table
- **THEN** each agent's AHT is shown alongside their other metrics

### Requirement: AHT export
AHT data SHALL be included in CSV and PDF report exports from the Analytics page.

#### Scenario: Export AHT in CSV
- **WHEN** a supervisor exports analytics as CSV
- **THEN** the CSV includes AHT per ticket and per agent
