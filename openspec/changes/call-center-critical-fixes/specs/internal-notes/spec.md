## ADDED Requirements

### Requirement: Internal vs Public Notes
The Ticket SHALL have two separate note types: `internalNotes` (array of `{ text, authorId, authorName, timestamp }`) visible only to authenticated agents, and `publicNotes` (single `{ text, authorId, authorName, timestamp }`) visible to customers in email notifications. The TicketDetail page SHALL display internal notes in a separate tab or section with a distinct visual style (e.g., amber background for internal, white for public).

#### Scenario: Agent adds internal note
- **WHEN** an agent adds an internal note to a ticket
- **THEN** the note is saved and visible only to other agents viewing the ticket

#### Scenario: Agent adds public note
- **WHEN** an agent adds a public resolution note
- **THEN** the note is saved and included in the next email notification to the customer

#### Scenario: Customer receives email with public notes only
- **WHEN** a ticket update email is sent to a customer
- **THEN** the email includes only public notes, not internal notes
