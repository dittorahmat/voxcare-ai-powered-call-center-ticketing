## ADDED Requirements

### Requirement: Scheduled report configuration
Admins SHALL configure recurring email reports with the following properties: report type (daily summary, weekly SLA compliance, weekly agent performance), schedule (daily at time X, weekly on day X at time Y), recipients (list of user emails or roles), and date range (yesterday, last 7 days, last 30 days).

#### Scenario: Create daily summary report
- **WHEN** an admin creates a daily summary report scheduled at 08:00 UTC sent to all supervisors
- **THEN** every day at 08:00 UTC, a PDF summary report is emailed to all supervisors

#### Scenario: Create weekly SLA report
- **WHEN** an admin creates a weekly SLA compliance report scheduled for Monday at 09:00 UTC
- **THEN** every Monday at 09:00 UTC, an SLA compliance PDF is emailed to the configured recipients

### Requirement: Scheduled report generation
Scheduled reports SHALL be generated via Cloudflare Cron Triggers. The report SHALL be generated as a PDF and sent via SendGrid to the configured recipients.

#### Scenario: Cron trigger generates report
- **WHEN** the cron trigger fires for a daily summary report
- **THEN** the report PDF is generated and emailed to all recipients

#### Scenario: Report generation failure logged
- **WHEN** a scheduled report fails to generate or send
- **THEN** the failure is logged and an admin notification is sent

### Requirement: Manage scheduled reports
Admins SHALL view, edit, pause, and delete scheduled reports from a settings page. The page SHALL show the last run time and next scheduled run time for each report.

#### Scenario: View scheduled reports
- **WHEN** an admin opens the Scheduled Reports settings page
- **THEN** they see a list of all configured reports with status, last run, and next run times

#### Scenario: Pause scheduled report
- **WHEN** an admin pauses a scheduled report
- **THEN** the report is no longer generated until re-enabled
