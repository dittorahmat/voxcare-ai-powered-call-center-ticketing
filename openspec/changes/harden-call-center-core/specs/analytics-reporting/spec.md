## ADDED Requirements

### Requirement: Ticket Volume Analytics
The system SHALL compute and expose ticket volume metrics: total tickets per day/week/month, tickets by status, tickets by priority, and tickets by category. Data SHALL be computed from the ticket store and aggregated by the requested time range.

#### Scenario: Viewing ticket volume for the last 7 days
- **WHEN** a supervisor requests ticket volume for the past week
- **THEN** the system returns daily counts of tickets created and resolved

#### Scenario: Viewing tickets by priority distribution
- **WHEN** a user requests the priority distribution
- **THEN** the system returns counts per priority level (low, medium, high, urgent)

### Requirement: Resolution Time Metrics
The system SHALL compute average, median, and p95 resolution times for resolved tickets. Metrics SHALL be filterable by date range, category, priority, and assigned agent.

#### Scenario: Computing average resolution time for urgent tickets
- **WHEN** a supervisor requests resolution time metrics filtered by priority `urgent`
- **THEN** the system returns the average, median, and p95 time to resolution for all resolved urgent tickets

#### Scenario: Resolution time with no resolved tickets
- **WHEN** metrics are requested for a filter with no resolved tickets
- **THEN** the system returns null/zero values with a "No data" indicator

### Requirement: Agent Performance Dashboard
The system SHALL compute per-agent performance metrics: tickets assigned, tickets resolved, average resolution time, SLA compliance rate, and current workload. This view SHALL be accessible to supervisors and admins only.

#### Scenario: Viewing agent performance leaderboard
- **WHEN** a supervisor views the analytics dashboard
- **THEN** agents are listed with their ticket counts, resolution times, and SLA compliance rates

#### Scenario: Agent viewing their own performance
- **WHEN** an agent views the analytics page and the role guard blocks access
- **THEN** the agent sees only their personal performance card (their own assigned tickets and resolution rate)

### Requirement: SLA Compliance Report
The system SHALL compute overall SLA compliance: the percentage of tickets resolved within SLA deadlines over a given period. The report SHALL break down compliance by priority level and show trends over time.

#### Scenario: SLA compliance report for the month
- **WHEN** an admin requests SLA compliance for the current month
- **THEN** the system returns the compliance percentage with a daily trend line

### Requirement: CSV Report Export
The system SHALL allow supervisors and admins to export analytics data as CSV files. Exportable reports SHALL include: ticket list (with filters), resolution time report, SLA compliance report, and agent performance report. The endpoint SHALL return a `text/csv` response with appropriate filename.

#### Scenario: Exporting ticket list as CSV
- **WHEN** a supervisor clicks "Export CSV" on the analytics page
- **THEN** a CSV file is downloaded with columns: ID, Title, Customer, Priority, Status, Category, AssignedTo, CreatedAt, ResolvedAt

#### Scenario: Export with date range filter
- **WHEN** a supervisor sets a date range and clicks "Export CSV"
- **THEN** the CSV file contains only tickets created within the specified date range

### Requirement: Analytics Dashboard UI
The frontend SHALL provide an analytics dashboard page (`/analytics`) with:
- Time range selector (today, 7d, 30d, custom)
- Summary cards (total tickets, resolved, avg resolution time, SLA compliance)
- Line chart for ticket volume over time
- Bar chart for tickets by category
- Donut chart for priority distribution
- Agent performance table
- Export buttons for each report

#### Scenario: Supervisor views analytics dashboard
- **WHEN** a supervisor navigates to `/analytics`
- **THEN** all charts, metrics, and the agent performance table are displayed

#### Scenario: Agent blocked from analytics dashboard
- **WHEN** an agent navigates to `/analytics`
- **THEN** the user is redirected to the dashboard with an access denied message
