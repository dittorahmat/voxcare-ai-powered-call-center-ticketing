## ADDED Requirements

### Requirement: Customer email notifications on ticket events
The system SHALL send an email to the customer via SendGrid Transactional API when a ticket is created, updated with a public note, or resolved. The email SHALL use an HTML template with ticket details and a link to the public ticket view.

#### Scenario: Ticket created
- **WHEN** a new ticket is created with a valid customer email
- **THEN** the system sends a "Ticket Created" email to the customer containing ticket title, description, and a public view link

#### Scenario: Ticket updated with public note
- **WHEN** an agent adds a public note to a ticket
- **THEN** the system sends a "Ticket Updated" email to the customer containing the public note text and a link to view the ticket

#### Scenario: Ticket resolved
- **WHEN** a ticket status changes to "resolved"
- **THEN** the system sends a "Ticket Resolved" email to the customer containing resolution notes and a CSAT survey link

#### Scenario: Internal note does not trigger email
- **WHEN** an agent adds an internal note to a ticket
- **THEN** no email is sent to the customer

### Requirement: Email template management
The system SHALL store HTML email templates in Durable Object storage with support for variables: `{{customer_name}}`, `{{ticket_id}}`, `{{ticket_title}}`, `{{ticket_status}}`, `{{ticket_url}}`, `{{agent_name}}`, `{{resolution_notes}}`. Admins SHALL manage templates via the settings page.

#### Scenario: Template variable substitution
- **WHEN** an email is sent
- **THEN** all template variables are replaced with actual values from the ticket and customer data

#### Scenario: Admin edits template
- **WHEN** an admin updates an email template in settings
- **THEN** the updated template is saved and used for all subsequent emails

### Requirement: Email threading in ticket view
The ticket detail page SHALL display a chronological thread of all emails sent to and received from the customer, inline with other activity. Inbound emails (via SendGrid inbound parse) SHALL appear as received messages. Outbound notification emails SHALL appear as sent messages.

#### Scenario: View email thread on ticket
- **WHEN** an agent opens a ticket with email history
- **THEN** the agent sees a chronological thread showing inbound and outbound emails with timestamps and content

#### Scenario: Inbound email creates ticket activity
- **WHEN** an inbound email is received via SendGrid webhook for an existing ticket
- **THEN** the email body is added to the ticket's activity thread as a received message

### Requirement: Public ticket view
The system SHALL provide a read-only public page at `/public/ticket/:token` where customers can view their ticket status, resolution notes, and submit a CSAT survey. The token SHALL be a UUID v4 stored on the ticket. Internal notes SHALL NOT be visible on the public view.

#### Scenario: Customer opens public ticket link
- **WHEN** a customer clicks the link in their notification email
- **THEN** they see a read-only page with ticket title, status, description, public notes, and resolution notes — but no internal notes

#### Scenario: Invalid token returns 404
- **WHEN** a user accesses `/public/ticket/:token` with an invalid or expired token
- **THEN** the system returns a 404 page
