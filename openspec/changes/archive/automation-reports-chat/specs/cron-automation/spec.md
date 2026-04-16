## ADDED Requirements

### Requirement: Cloudflare Cron Triggers configured for automated jobs
The system SHALL configure Cloudflare Cron Triggers in `wrangler.jsonc` to execute the `scheduled()` handler at fixed intervals for: auto-close evaluation, CSAT reminders, CSAT cleanup, and scheduled report delivery.

#### Scenario: Cron triggers are deployed
- **WHEN** the worker is deployed with cron trigger configuration
- **THEN** Cloudflare invokes the `scheduled()` handler at each configured cron interval

### Requirement: Cron handler executes auto-close rule evaluation
The `scheduled()` handler SHALL call the auto-close evaluation logic every 30 minutes against all non-closed, non-merged tickets.

#### Scenario: Auto-close rules evaluated on schedule
- **WHEN** the cron handler fires for auto-close evaluation
- **THEN** all enabled auto-close rules are evaluated against eligible tickets, and matching tickets have their status updated per rule actions

#### Scenario: Auto-close creates audit entries
- **WHEN** a ticket is auto-closed by a rule
- **THEN** an audit log entry is created with action "auto-closed", userId "system"

### Requirement: Cron handler sends CSAT reminder emails
The `scheduled()` handler SHALL identify resolved tickets from 24-48 hours ago with no CSAT response and send reminder emails to the customer.

#### Scenario: CSAT reminder sent for eligible tickets
- **WHEN** the cron handler fires for CSAT reminders
- **THEN** for each ticket resolved 24-48 hours ago with no CSAT, a reminder email is sent to the customer with the CSAT link

### Requirement: Cron handler performs CSAT cleanup
The `scheduled()` handler SHALL identify CSAT responses older than 90 days and mark them for cleanup (daily at 3am).

#### Scenario: Old CSAT responses cleaned up
- **WHEN** the cron handler fires for CSAT cleanup
- **THEN** CSAT responses older than 90 days are deleted from storage and the count is logged

### Requirement: Cron handler delivers scheduled reports
The `scheduled()` handler SHALL evaluate all enabled `ScheduledReport` definitions, generate HTML reports, and email them to configured recipients.

#### Scenario: Scheduled report delivered on time
- **WHEN** the cron handler fires for report delivery AND a `ScheduledReport` has `nextRunAt <= now` and `enabled: true`
- **THEN** an HTML report is generated for the configured date range and emailed to all recipients, and `lastRunAt`/`nextRunAt` are updated

#### Scenario: Scheduled report delivery failure logged
- **WHEN** scheduled report delivery fails for a report
- **THEN** the error is logged and the report's `lastRunAt` is NOT updated (so it retries on next cycle)

### Requirement: Scheduled report nextRunAt calculation
The system SHALL correctly calculate `nextRunAt` based on report frequency (daily or weekly with day-of-week).

#### Scenario: Daily report nextRunAt calculated
- **WHEN** a daily report is delivered
- **THEN** `nextRunAt` is set to the same time on the following day

#### Scenario: Weekly report nextRunAt calculated
- **WHEN** a weekly report (e.g., Monday) is delivered
- **THEN** `nextRunAt` is set to the same time on the following week's matching day

### Requirement: Cron handler is resilient to individual job failures
The `scheduled()` handler SHALL catch errors from individual job executions and continue processing remaining jobs.

#### Scenario: One cron job fails, others continue
- **WHEN** the auto-close evaluation throws an error
- **THEN** the error is logged and CSAT reminders, CSAT cleanup, and scheduled report delivery still execute

### Requirement: Cron execution observability
The `scheduled()` handler SHALL log execution start, each job's start/completion, and any errors to the Worker's observability pipeline.

#### Scenario: Cron execution logged
- **WHEN** the scheduled handler runs
- **THEN** logs include: cron start timestamp, each job name + start + result (success/error), cron end timestamp
