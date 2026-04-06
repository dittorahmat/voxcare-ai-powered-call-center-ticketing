## ADDED Requirements

### Requirement: Customer dashboard
Authenticated customers SHALL access a dashboard showing their ticket summary: total tickets, open tickets, resolved tickets, and recent activity.

#### Scenario: Customer views dashboard
- **WHEN** a logged-in customer navigates to their dashboard
- **THEN** the system displays ticket counts (total, open, resolved) and the 5 most recent tickets

#### Scenario: Customer sees only their own tickets
- **WHEN** a customer views their dashboard
- **THEN** only tickets linked to their `customerId` are displayed

### Requirement: Customer ticket list
Customers SHALL view a paginated list of their own tickets with status, priority, title, creation date, and last update date.

#### Scenario: Customer views all their tickets
- **WHEN** a customer navigates to their ticket list
- **THEN** only tickets where `customerId` matches their ID are displayed, sorted by most recent first

#### Scenario: Customer cannot see other customers' tickets
- **WHEN** a customer attempts to access a ticket belonging to another customer
- **THEN** the system returns a 403 Forbidden error

### Requirement: Customer ticket detail
Customers SHALL view the details of their own tickets, including description, status, priority, public notes, and attachments. Internal notes SHALL NOT be visible.

#### Scenario: Customer views their ticket detail
- **WHEN** a customer opens a ticket they own
- **THEN** the system displays title, description, status, priority, public notes, attachments, and activity timeline (excluding internal notes)

#### Scenario: Customer views merged ticket
- **WHEN** a customer opens a ticket that has been merged
- **THEN** the system displays a notice that the ticket was merged and provides a link to the primary ticket

### Requirement: Customer profile management
Customers SHALL view and update their profile information: name, phone, company. Customers SHALL be able to change their password.

#### Scenario: Customer updates profile
- **WHEN** a customer submits updated name, phone, or company
- **THEN** the system saves the changes and displays a success message

#### Scenario: Customer changes password
- **WHEN** a customer submits their current password and a new valid password
- **THEN** the system updates the password hash and returns success

### Requirement: Customer portal pages routing
The customer portal SHALL have the following routes: `/customer/login`, `/customer/register`, `/customer/verify/:token`, `/customer/forgot-password`, `/customer/dashboard`, `/customer/tickets`, `/customer/tickets/:id`, `/customer/profile`. All routes except login, register, verify, and forgot-password SHALL require customer authentication.

#### Scenario: Unauthenticated access to dashboard
- **WHEN** an unauthenticated user navigates to `/customer/dashboard`
- **THEN** the system redirects to `/customer/login` with a return URL

#### Scenario: Authenticated access to login
- **WHEN** a logged-in customer navigates to `/customer/login`
- **THEN** the system redirects to `/customer/dashboard`
