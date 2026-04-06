## ADDED Requirements

### Requirement: PDF report generation
Supervisors and admins SHALL generate PDF reports from the Analytics page. Report types SHALL include: Ticket Summary (volume by status/priority/category), SLA Compliance (compliance rate, breached tickets list), and Agent Performance (per-agent metrics table).

#### Scenario: Generate SLA compliance report
- **WHEN** a supervisor clicks "Export PDF" on the Analytics page and selects "SLA Compliance"
- **THEN** a formatted PDF is downloaded containing compliance rate, chart, and list of breached tickets

#### Scenario: Generate agent performance report
- **WHEN** a supervisor selects "Agent Performance" report type
- **THEN** a PDF is generated with a table showing each agent's assigned, resolved, SLA compliance %, and average resolution time

### Requirement: PDF report includes date range
All PDF reports SHALL clearly display the date range covered and the generation timestamp.

#### Scenario: Date range in report header
- **WHEN** a PDF report is generated
- **THEN** the header includes "Report Period: [From Date] to [To Date]" and "Generated: [Timestamp]"

### Requirement: PDF report branding
PDF reports SHALL include company branding (name, logo) from system settings.

#### Scenario: Branded report
- **WHEN** any PDF report is generated
- **THEN** the company name and logo appear in the header
