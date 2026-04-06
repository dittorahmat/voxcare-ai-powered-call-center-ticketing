## ADDED Requirements

### Requirement: Customer ticket submission
Authenticated customers SHALL create new tickets through the portal by providing a title, description, category, and optional file attachments.

#### Scenario: Customer creates a ticket
- **WHEN** a logged-in customer submits the new ticket form with title, description, and category
- **THEN** the system creates a ticket linked to the customer's account and sends a confirmation email

#### Scenario: Customer attaches files to ticket
- **WHEN** a customer uploads files while creating a ticket
- **THEN** the files are stored in R2 and attached to the ticket

#### Scenario: Ticket auto-assigned
- **WHEN** a customer creates a ticket
- **THEN** the system applies the standard auto-assignment logic (skills-based routing + round-robin fallback)

### Requirement: Customer ticket viewing permissions
Customers SHALL only view tickets where `customerId` matches their own customer ID. The system SHALL enforce this at the API middleware level.

#### Scenario: Customer views their own ticket
- **WHEN** a customer requests a ticket they own
- **THEN** the system returns the ticket data (excluding internal notes)

#### Scenario: Customer attempts to view another customer's ticket
- **WHEN** a customer requests a ticket with a different `customerId`
- **THEN** the middleware returns a 403 Forbidden error without revealing the ticket exists

### Requirement: Customer ticket notifications
Customers SHALL receive email notifications when their ticket is updated with a public note, resolved, or assigned to an agent.

#### Scenario: Customer receives update notification
- **WHEN** an agent adds a public note to a customer's ticket
- **THEN** the customer receives an email notification with the note content and a link to view the ticket in the portal

#### Scenario: Customer receives resolution notification
- **WHEN** a customer's ticket is resolved
- **THEN** the customer receives a resolution email with the resolution notes and a CSAT survey link
