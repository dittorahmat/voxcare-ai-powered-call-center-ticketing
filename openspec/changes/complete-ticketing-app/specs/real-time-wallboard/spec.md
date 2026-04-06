## ADDED Requirements

### Requirement: Real-time wallboard page
The system SHALL provide a full-screen dashboard at `/wallboard` optimized for TV display. The wallboard SHALL show: active agent count, tickets by status, today's SLA compliance rate, today's new vs resolved ticket counts, average first response time, and top 5 agents by tickets resolved today.

#### Scenario: View wallboard
- **WHEN** a user navigates to `/wallboard`
- **THEN** they see a full-screen layout with live call center metrics

#### Scenario: Wallboard auto-refreshes
- **WHEN** the wallboard page is visible
- **THEN** it fetches fresh data every 15 seconds from `/api/wallboard`

#### Scenario: Wallboard pauses when tab hidden
- **WHEN** the browser tab is not visible
- **THEN** auto-refresh is paused via the Page Visibility API to reduce server load

### Requirement: Wallboard data endpoint
The system SHALL provide a `GET /api/wallboard` endpoint that returns aggregated real-time metrics in a single response. Accessible to all authenticated users.

#### Scenario: Fetch wallboard data
- **WHEN** the wallboard calls `GET /api/wallboard`
- **THEN** it receives `{ agents: { active, total }, tickets: { open, inProgress, resolved }, slaCompliance: number, today: { new, resolved }, avgFirstResponseTime: number, topAgents: [...] }`

### Requirement: Wallboard layout is high-contrast and readable
The wallboard SHALL use large fonts, high-contrast colors, and clear visual hierarchy for readability from a distance on a TV display.

#### Scenario: Wallboard on TV display
- **WHEN** the wallboard is displayed on a 55" TV from 3 meters away
- **THEN** all numbers and labels are clearly readable

### Requirement: Wallboard SLA status color coding
SLA compliance SHALL be color-coded: green (>90%), yellow (75-90%), red (<75%).

#### Scenario: SLA compliance is good
- **WHEN** SLA compliance is 95%
- **THEN** the SLA indicator is displayed in green

#### Scenario: SLA compliance is critical
- **WHEN** SLA compliance is 60%
- **THEN** the SLA indicator is displayed in red
