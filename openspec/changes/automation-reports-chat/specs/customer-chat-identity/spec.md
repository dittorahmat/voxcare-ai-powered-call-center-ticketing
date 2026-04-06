## ADDED Requirements

### Requirement: Customer chat sessions include authenticated identity
The system SHALL populate `customerName` and `customerEmail` fields in the chat session when an authenticated customer creates or joins a chat session.

#### Scenario: Authenticated customer starts chat
- **WHEN** an authenticated customer (via `CustomerAuthContext`) opens the chat page and sends their first message
- **THEN** the chat session is created with `customerName` set to the customer's name and `customerEmail` set to the customer's email from their auth profile

#### Scenario: Anonymous visitor uses embeddable widget
- **WHEN** a visitor uses the embeddable chat widget without authentication
- **THEN** the chat session is created with `customerName: 'Website Visitor'` and `customerEmail: null` (current behavior preserved)

### Requirement: Chat session creation accepts customer identity fields
The `POST /api/chat-sessions` endpoint SHALL accept `customerId`, `customerName`, and `customerEmail` in the request body and store them in the `ChatSession` record.

#### Scenario: Chat session created with customer identity
- **WHEN** `POST /api/chat-sessions` is called with `{ customerId: "cust-123", customerName: "John Doe", customerEmail: "john@example.com" }`
- **THEN** the created session has `customerId`, `customerName`, and `customerEmail` populated

### Requirement: Agent sees customer identity in chat queue
The agent chat queue UI SHALL display the customer's name and email (when available) for each waiting chat session.

#### Scenario: Agent views chat queue
- **WHEN** agent opens the chat queue page
- **THEN** each session shows the customer name (or "Anonymous" if null) and email (if available)

### Requirement: Embeddable widget accepts optional customer data
The embeddable chat widget JavaScript SHALL accept optional `data-customer-name` and `data-customer-email` attributes on the `<script>` tag to pre-populate customer identity.

#### Scenario: Website passes customer data to widget
- **WHEN** a logged-in customer visits a website that embeds the widget with `<script data-customer-name="Jane" data-customer-email="jane@example.com">`
- **THEN** the widget creates the chat session with the provided customer name and email

### Requirement: Chat history associated with customer profile
Chat sessions created by authenticated customers SHALL be queryable by the customer via `GET /api/customer/chat-sessions` (new endpoint).

#### Scenario: Customer views their past chats
- **WHEN** authenticated customer GETs `/api/customer/chat-sessions`
- **THEN** the system returns all chat sessions where `customerId` matches the authenticated customer's ID

### Requirement: Customer identity preserved in ticket escalation
When a chat session is escalated to a ticket, the ticket's `customerId` field SHALL be set to the chat session's `customerId` if available.

#### Scenario: Authenticated customer's chat escalated
- **WHEN** a chat session with `customerId: "cust-123"` is escalated to a ticket
- **THEN** the created ticket has `customerId: "cust-123"` linking it to the customer record
