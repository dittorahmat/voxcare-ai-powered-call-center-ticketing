## MODIFIED Requirements

### Requirement: Analytics Range Filter
The `/api/analytics/volume`, `/api/analytics/resolution-time`, and `/api/analytics/sla-compliance` endpoints SHALL accept `?from=` and `?to=` ISO date query parameters to filter results by date range. When a user selects a range (Today, 7 Days, 30 Days, Custom) in the AnalyticsDashboard, the system SHALL compute the appropriate `from` and `to` dates and pass them as query parameters. If no data exists for the selected range, the system SHALL display "No data for selected range" instead of empty charts.

#### Scenario: Selecting 7-day range filters data
- **WHEN** a user selects "7 Days" in the AnalyticsDashboard
- **THEN** the API is called with `?from=<7-days-ago>&to=<now>` and charts update

#### Scenario: No data for selected range
- **WHEN** the API returns empty data for the selected range
- **THEN** charts display "No data for selected range"
