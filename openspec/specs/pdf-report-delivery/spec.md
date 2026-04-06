# pdf-report-delivery Specification

## Purpose
TBD - created by archiving change phase1-2-customer-ops-excellence. Update Purpose after archive.
## Requirements
### Requirement: PDF report download endpoint
The system SHALL provide a `GET /api/reports/:type/pdf` endpoint that generates a PDF report and returns it as a downloadable file. Supported types: `ticket-summary`, `sla-compliance`, `agent-performance`.

#### Scenario: Agent downloads PDF report
- **WHEN** authenticated supervisor/admin GETs `/api/reports/ticket-summary/pdf?from=2026-04-01&to=2026-04-06`
- **THEN** a PDF file is returned with `Content-Type: application/pdf` and `Content-Disposition: attachment` headers

#### Scenario: Unauthorized user attempts PDF download
- **WHEN** a non-supervisor/non-admin user requests a PDF report
- **THEN** the system returns 403 Forbidden

### Requirement: HTML report email for scheduled delivery
The system SHALL generate HTML-format report bodies for scheduled report delivery, containing summary tables and metrics. PDF attachments SHALL be included only if server-side PDF rendering is available; otherwise, the email SHALL contain a link to the web-based PDF download.

#### Scenario: Scheduled report sent as HTML email
- **WHEN** a scheduled report is delivered via cron
- **THEN** an HTML email is composed with report data tables and sent to all configured recipients via SendGrid

### Requirement: PDF report generation uses Cloudflare Browser Rendering API
The system SHALL generate server-side PDFs by sending rendered HTML to the Cloudflare Browser Rendering API, which returns a PDF blob. The worker SHALL construct HTML report templates and POST them to the Browser Rendering `/pdf` endpoint.

#### Scenario: Browser Rendering API unavailable
- **WHEN** the Browser Rendering API returns an error or times out
- **THEN** the system generates an HTML report email instead and logs a warning

### Requirement: Report data fetched from AppController
PDF and HTML reports SHALL fetch data directly from the AppController Durable Object (ticket list, SLA records, agent data) rather than calling internal HTTP endpoints.

#### Scenario: Ticket summary report generated
- **WHEN** a ticket-summary PDF is requested
- **THEN** the worker calls `controller.listTickets()`, computes metrics (total, resolved, SLA compliance, FCR, AHT), and renders the PDF

### Requirement: Report date range filtering
All report types SHALL support date range filtering via `from` and `to` query parameters (ISO date strings).

#### Scenario: Report filtered by date range
- **WHEN** user requests `/api/reports/sla-compliance/pdf?from=2026-03-01&to=2026-03-31`
- **THEN** only SLA records within the March 2026 date range are included in the report

### Requirement: Scheduled report delivery respects frequency and time
The scheduled report cron handler SHALL only deliver a report when its `nextRunAt` has passed, and SHALL update `lastRunAt` and `nextRunAt` after successful delivery.

#### Scenario: Report not yet due
- **WHEN** the cron handler runs but a report's `nextRunAt` is in the future
- **THEN** the report is skipped and no email is sent

### Requirement: Scheduled report email includes metadata
Each scheduled report email SHALL include: report type label, date range covered, generation timestamp, and a "View in Dashboard" link to the VoxCare web UI.

#### Scenario: Agent receives scheduled report email
- **WHEN** a weekly SLA report is delivered
- **THEN** the email subject is "VoxCare Weekly SLA Compliance Report — {date range}", the body contains SLA metrics table, and a footer includes the generation timestamp and dashboard link

