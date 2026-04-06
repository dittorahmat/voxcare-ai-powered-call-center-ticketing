## ADDED Requirements

### Requirement: Email-to-Ticket via SendGrid Inbound Parse
The system SHALL expose `POST /api/email/inbound` as a webhook endpoint for SendGrid Inbound Parse. When an email is received, the system SHALL: parse the sender email, match or create a customer by email address, create a ticket with the email body as transcript, save attachments to R2 storage, and set the ticket status to `open`. The endpoint SHALL validate the SendGrid webhook signature to prevent spoofing.

#### Scenario: Email from known customer creates ticket
- **WHEN** an email is received from an existing customer's email address
- **THEN** a new ticket is created linked to that customer with the email body as transcript

#### Scenario: Email from unknown sender creates customer and ticket
- **WHEN** an email is received from a new email address
- **THEN** a new customer is created and a ticket is linked to them

#### Scenario: Email with attachments
- **WHEN** an inbound email has file attachments
- **THEN** files are uploaded to R2 and linked to the created ticket

### Requirement: Outbound Email Notifications via SendGrid
The system SHALL send email notifications via SendGrid Transactional API when: a ticket is created (to customer), a ticket is updated (to customer if public notes added), a ticket is resolved (to customer), a ticket is assigned (to agent), or a ticket is escalated (to supervisor). Emails SHALL use HTML templates with ticket details and a "View Ticket" link.

#### Scenario: New ticket notification to customer
- **WHEN** a ticket is created via email-to-ticket
- **THEN** the customer receives an email confirmation with ticket ID and details

#### Scenario: Ticket resolved notification
- **WHEN** an agent marks a ticket as resolved
- **THEN** the customer receives an email with the resolution notes

### Requirement: Email Configuration
The system SHALL provide settings for SendGrid API key, "from" email address, and "from" display name. These settings SHALL be configurable via the Settings page.

#### Scenario: Admin configures SendGrid
- **WHEN** an admin enters their SendGrid API key and from address
- **THEN** email notifications are sent using those credentials
