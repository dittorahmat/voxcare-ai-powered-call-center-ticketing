## ADDED Requirements

### Requirement: Real-time live chat between customer and agent
The system SHALL support real-time text-based chat between a customer and a human agent. Messages SHALL be delivered via SSE (Server-Sent Events) with a maximum latency of 2 seconds.

#### Scenario: Customer sends a message
- **WHEN** a customer types a message and submits it in the chat
- **THEN** the message is stored, delivered to the assigned agent via SSE within 2 seconds, and displayed in the chat transcript

#### Scenario: Agent sends a message
- **WHEN** an agent types a message and submits it in the chat
- **THEN** the message is stored, delivered to the customer via SSE within 2 seconds, and displayed in the chat transcript

#### Scenario: Chat disconnect and reconnect
- **WHEN** a customer's SSE connection drops and reconnects within 30 seconds
- **THEN** the system resumes message delivery from the last received message ID

### Requirement: Typing indicators
The system SHALL broadcast typing indicators from both customer and agent to the other party in real-time.

#### Scenario: Customer starts typing
- **WHEN** a customer begins typing in the chat input
- **THEN** the agent sees a "Customer is typing..." indicator within 2 seconds

#### Scenario: Agent starts typing
- **WHEN** an agent begins typing in the chat input
- **THEN** the customer sees an "Agent is typing..." indicator within 2 seconds

### Requirement: File attachments in chat
Customers and agents SHALL be able to send file attachments (images, PDFs, documents up to 10MB) within the chat. Files SHALL be stored in Cloudflare R2.

#### Scenario: Customer attaches a file
- **WHEN** a customer uploads a file in the chat
- **THEN** the file is uploaded to R2, a message with the file link is sent, and the agent can download it

#### Scenario: Agent attaches a file
- **WHEN** an agent uploadss a file in the chat
- **THEN** the file is uploaded to R2, a message with the file link is sent, and the customer can download it

### Requirement: Chat transcript persistence
The system SHALL persist the full chat transcript, including messages, file attachments, and timestamps, for the duration of the chat and for 90 days after closure.

#### Scenario: Chat transcript retrieval
- **WHEN** an agent or customer views a previous chat session
- **THEN** the full transcript is available with all messages, timestamps, and file links

#### Scenario: Chat transcript auto-purge
- **WHEN** a closed chat transcript is older than 90 days
- **THEN** the system marks the transcript for deletion and removes it from storage

### Requirement: Chat session states
Each chat session SHALL progress through the following states: `collecting` (AI bot gathering info) → `waiting` (queued for agent) → `active` (agent connected) → `closed` (ended by agent or timeout).

#### Scenario: Chat state transitions
- **WHEN** a customer starts a chat
- **THEN** the chat begins in `collecting` state, transitions to `waiting` when AI handoff occurs, then to `active` when an agent accepts, then to `closed` when the agent ends the chat

#### Scenario: Chat timeout
- **WHEN** a chat in `active` state has no messages for 30 minutes
- **THEN** the system automatically transitions the chat to `closed` state and creates a ticket from the transcript
