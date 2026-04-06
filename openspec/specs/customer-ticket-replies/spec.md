# customer-ticket-replies Specification

## Purpose
TBD - created by archiving change phase1-2-customer-ops-excellence. Update Purpose after archive.
## Requirements
### Requirement: Customer can reply to their own tickets
The system SHALL allow authenticated customers to add reply messages to tickets they own. Replies SHALL be stored as part of the ticket's conversation thread and SHALL be visible to both the customer and assigned agents.

#### Scenario: Customer submits a reply
- **WHEN** authenticated customer POSTs a reply to their ticket via `POST /api/customer/tickets/:id/replies`
- **THEN** the reply is stored in the ticket's `replies` array with the customer as sender, and the ticket's `lastCustomerReplyAt` is updated to the current timestamp

#### Scenario: Unauthorized customer attempts to reply
- **WHEN** a customer attempts to reply to a ticket they do not own
- **THEN** the system returns 403 Forbidden

#### Scenario: Reply updates ticket updatedAt
- **WHEN** a customer replies to a ticket
- **THEN** the ticket's `updatedAt` timestamp is set to the current time (for auto-close rule evaluation)

### Requirement: Agent can view customer replies in ticket detail
The system SHALL display all customer replies in the agent ticket detail view as part of a chronological conversation thread.

#### Scenario: Agent views ticket with customer replies
- **WHEN** agent opens ticket detail page
- **THEN** all replies (from both customers and agents) are displayed in chronological order with sender identification and timestamps

### Requirement: Agent can reply to tickets
The system SHALL allow agents, supervisors, and admins to add reply messages to any ticket. Agent replies SHALL be visible to both agents and the customer.

#### Scenario: Agent submits a reply
- **WHEN** agent POSTs a reply via `POST /api/tickets/:id/replies`
- **THEN** the reply is stored in the ticket's `replies` array with the agent as sender

### Requirement: Reply thread replaces publicNotes
The system SHALL maintain a unified conversation thread in `Ticket.replies[]` that includes messages from both customers and agents. The existing `publicNotes` field SHALL be deprecated but preserved for backward compatibility.

#### Scenario: Existing ticket with publicNotes is accessed
- **WHEN** a ticket with non-null `publicNotes` is read after migration
- **THEN** the `publicNotes` content is included as the first entry in the `replies` array, and the `publicNotes` field remains intact for fallback

### Requirement: Customers can attach files to replies
The system SHALL allow customers to upload file attachments when replying to tickets. Attachments SHALL be stored in R2 and linked to the reply.

#### Scenario: Customer attaches file to reply
- **WHEN** customer uploads a file (max 10MB, allowed types: jpg, png, pdf, doc, docx, txt) with their reply
- **THEN** the file is stored in R2 and the attachment metadata is linked to the reply

### Requirement: Notification sent to agent on customer reply
The system SHALL create a notification for the assigned agent (if any) when a customer replies to a ticket. If the ticket is unassigned, notifications SHALL be sent to all available agents.

#### Scenario: Customer replies to assigned ticket
- **WHEN** customer replies to a ticket with an assigned agent
- **THEN** a `ticket-updated` notification is created for the assigned agent

#### Scenario: Customer replies to unassigned ticket
- **WHEN** customer replies to a ticket with no assigned agent
- **THEN** `ticket-updated` notifications are created for all available agents

### Requirement: Email notification to agent on customer reply
The system SHALL send an email to the assigned agent when a customer replies, if the agent's notification preferences have `emailEnabled: true`.

#### Scenario: Agent has email notifications enabled
- **WHEN** customer replies to the agent's ticket AND agent's `notificationPrefs.emailEnabled` is true
- **THEN** an email is sent to the agent with the reply content and ticket link

### Requirement: Reply API respects rate limiting
The system SHALL apply rate limiting to customer reply endpoints to prevent abuse.

#### Scenario: Customer sends too many replies rapidly
- **WHEN** customer exceeds 10 replies per minute on a single ticket
- **THEN** the system returns 429 Too Many Requests

### Requirement: Conversation thread supports chronological sorting
The system SHALL return all replies in a ticket sorted by `timestamp` ascending (oldest first).

#### Scenario: Thread retrieved with mixed sender replies
- **WHEN** `GET /api/tickets/:id/replies` is called
- **THEN** replies are returned sorted by timestamp in ascending order

