## ADDED Requirements

### Requirement: Bulk email to customers from ticket list
Supervisors and admins SHALL select multiple tickets from the ticket list and send a bulk status update email to the customers associated with those tickets. The email SHALL use a configurable template with ticket-specific details.

#### Scenario: Send bulk status update
- **WHEN** a supervisor selects 5 tickets and clicks "Email Customers"
- **THEN** an email is sent to each ticket's customer with their specific ticket details

#### Scenario: Bulk email respects per-ticket template
- **WHEN** bulk emails are sent
- **THEN** each email includes the specific ticket's title, status, and notes — not a generic message

### Requirement: Bulk email preview
Before sending, the system SHALL show a preview of how many emails will be sent, to which customers, and a sample of the email content.

#### Scenario: Preview before sending
- **WHEN** a supervisor selects tickets and clicks "Email Customers"
- **THEN** a dialog shows the recipient count, customer names, and a preview of the email

### Requirement: Bulk email audit logging
Bulk email sends SHALL be logged in the audit trail with the sender, recipient count, ticket IDs, and timestamp.

#### Scenario: Bulk email logged
- **WHEN** a supervisor sends bulk emails to 5 customers
- **THEN** an audit entry records who sent it, how many emails, and which tickets
