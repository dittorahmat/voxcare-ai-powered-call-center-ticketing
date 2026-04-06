## ADDED Requirements

### Requirement: Auto-escalation on SLA breach
When an SLA breach is detected (during cron evaluation or ticket load), the system SHALL automatically bump the ticket's priority up one level: low→medium, medium→high, high→critical. Priority SHALL NOT be bumped beyond critical. The escalation SHALL be logged in the audit trail with the trigger reason.

#### Scenario: Priority bumped on SLA breach
- **WHEN** a medium-priority ticket breaches its SLA response deadline
- **THEN** the ticket priority is changed to high and an audit entry records the auto-escalation

#### Scenario: Critical ticket not escalated further
- **WHEN** a critical-priority ticket breaches SLA
- **THEN** the priority remains critical (no further escalation) and a supervisor notification is sent

### Requirement: Supervisor notification on SLA breach
When an SLA breach occurs, the system SHALL create a real-time notification for all users with supervisor or admin role. The notification SHALL include ticket title, priority, breached deadline, and a link to the ticket.

#### Scenario: Supervisor notified of breach
- **WHEN** any ticket breaches its SLA deadline
- **THEN** all supervisors and admins receive an SSE notification with ticket details

### Requirement: SLA breach email to supervisor
In addition to SSE notification, the system SHALL send an email to all supervisors when a ticket's SLA is breached. The email SHALL include ticket details and the new escalated priority.

#### Scenario: Breach email sent
- **WHEN** a ticket breaches SLA
- **THEN** all supervisors receive an email alert about the breached ticket

### Requirement: Escalation flag on SLA record
The SLA record SHALL include an `escalationTriggered: boolean` field to prevent duplicate escalations for the same breach event.

#### Scenario: No duplicate escalation
- **WHEN** a ticket's SLA is breached and already has `escalationTriggered: true`
- **THEN** no further auto-escalation occurs for that breach
