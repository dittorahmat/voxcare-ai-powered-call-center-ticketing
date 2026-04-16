## ADDED Requirements

### Requirement: Agent quality dashboard
Each agent SHALL see their own quality metrics: composite quality score, CSAT average, SLA compliance %, resolution time average, and trend over time.

#### Scenario: Agent views their quality dashboard
- **WHEN** agent navigates to quality page
- **THEN** they see: current composite score, CSAT avg, SLA compliance %, avg resolution time, and a trend chart for the last 30 days

### Requirement: Supervisor quality dashboard
Supervisors and admins SHALL see team-wide quality metrics: team composite score, per-agent rankings, tickets reviewed, coaching notes count, and quality distribution.

#### Scenario: Supervisor views team quality
- **WHEN** supervisor navigates to quality page
- **THEN** they see: team composite score, agent leaderboard (ranked by composite score), tickets reviewed this period, and quality score distribution chart

### Requirement: Composite quality score calculation
The composite quality score SHALL be calculated as: (Manual Scorecard × 0.4) + (CSAT avg × 0.3) + (SLA compliance % × 0.2) + (Sentiment avg × 0.1).

#### Scenario: Composite score calculated for agent
- **WHEN** Agent A has: Manual avg=4.0/5, CSAT avg=4.2/5, SLA=90%, Sentiment avg=0.3
- **THEN** composite = (4.0×0.4) + (4.2×0.3) + (0.90×0.2) + (0.65×0.1) = 1.6 + 1.26 + 0.18 + 0.065 = 3.105/5 (rounded to 3.1)

### Requirement: Quality trend chart
The dashboard SHALL display a line chart showing composite quality score over the selected date range.

#### Scenario: Agent views quality trend
- **WHEN** agent selects "Last 30 Days" range
- **THEN** a line chart shows daily composite scores for the last 30 days
