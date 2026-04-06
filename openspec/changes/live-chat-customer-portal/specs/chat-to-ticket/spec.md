## ADDED Requirements

### Requirement: Auto-create ticket from chat transcript
When a chat session ends (agent closes or 30-minute inactivity timeout), the system SHALL automatically create a ticket from the chat transcript with the AI-generated summary as the ticket notes.

#### Scenario: Agent closes chat and saves as ticket
- **WHEN** an agent ends a chat and selects "Save as ticket"
- **THEN** the system creates a ticket with the chat transcript as notes, AI summary as the title/description, and the customer linked to the ticket

#### Scenario: Agent closes chat without ticket
- **WHEN** an agent ends a chat and selects "Close without ticket"
- **THEN** the chat transcript is archived but no ticket is created

#### Scenario: Inactivity timeout creates ticket
- **WHEN** a chat has no messages for 30 minutes
- **THEN** the system automatically closes the chat and creates a ticket from the transcript

### Requirement: Ticket fields from chat
The auto-created ticket SHALL have the following fields populated from the chat: title (from AI summary), description (from chat transcript), customer (linked to customer account if authenticated), category (from AI suggestion or default), priority (from AI suggestion or default), and internal notes (full chat transcript with timestamps).

#### Scenario: Ticket created with all fields
- **WHEN** a chat is converted to a ticket
- **THEN** the ticket has title, description, customer link, category, priority, and internal notes populated from the chat data

#### Scenario: Ticket notification sent
- **WHEN** a ticket is created from a chat
- **THEN** the standard ticket-created notification is sent to the assigned agent and supervisors

### Requirement: CSAT survey after chat
After a chat ends, the customer SHALL receive a CSAT survey (1-5 stars + optional comment) about the chat experience, separate from the ticket CSAT.

#### Scenario: CSAT sent after chat
- **WHEN** a chat ends and the customer provided an email
- **THEN** the system sends a CSAT survey email within 5 minutes of chat closure

#### Scenario: Duplicate CSAT blocked
- **WHEN** a customer attempts to submit a second CSAT for the same chat
- **THEN** the system rejects the duplicate and shows their previous response
