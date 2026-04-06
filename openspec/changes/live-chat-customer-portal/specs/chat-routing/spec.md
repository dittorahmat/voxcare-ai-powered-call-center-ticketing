## ADDED Requirements

### Requirement: AI greeting bot
When a customer starts a chat, an AI bot SHALL greet the customer, collect their name and problem description, suggest basic troubleshooting if applicable, and prepare a summary for agent handoff.

#### Scenario: AI collects customer info
- **WHEN** a customer starts a new chat
- **THEN** the AI bot greets the customer, asks for their name, asks about their problem, and attempts basic troubleshooting (e.g., "Have you tried restarting?")

#### Scenario: AI generates summary
- **WHEN** the AI has collected sufficient information
- **THEN** the AI generates a summary containing: customer name, problem description, suggested category, suggested priority, troubleshooting steps attempted, and full chat transcript

### Requirement: Agent chat queue
The system SHALL maintain a queue of waiting chats. Available agents SHALL see incoming chats with AI-generated summaries. Agents SHALL be able to accept, transfer, or decline a chat.

#### Scenario: Agent sees incoming chat
- **WHEN** a chat transitions from `collecting` to `waiting` state
- **THEN** all available agents see the chat in their queue with the AI summary (customer name, problem, suggested category/priority, transcript)

#### Scenario: Agent accepts chat
- **WHEN** an agent clicks "Accept" on a waiting chat
- **THEN** the chat transitions to `active` state, the agent is assigned, and the customer is notified that an agent has joined

#### Scenario: Agent declines chat
- **WHEN** an agent clicks "Decline" on a waiting chat
- **THEN** the chat remains in `waiting` state and is offered to the next available agent

#### Scenario: Agent transfers chat
- **WHEN** an agent clicks "Transfer" on an active chat
- **THEN** the chat returns to `waiting` state and is offered to other available agents with a transfer note

### Requirement: Agent routing for chats
Chats SHALL be routed to available agents using round-robin assignment, respecting the maximum concurrent chats per agent (default: 2). If no agents are available, the AI bot SHALL inform the customer of the wait time.

#### Scenario: Chat routed to available agent
- **WHEN** a chat enters `waiting` state and an agent is available with fewer than max concurrent chats
- **THEN** the chat is offered to that agent via round-robin

#### Scenario: No agents available
- **WHEN** a chat enters `waiting` state and no agents are available
- **THEN** the AI bot informs the customer of the estimated wait time and offers to leave a message (which creates a ticket)

### Requirement: Agent chat metrics
The agent dashboard SHALL display chat-related metrics: chats handled today, average first response time for chats, and current active chat count.

#### Scenario: Agent views chat metrics
- **WHEN** an agent views their dashboard
- **THEN** the system displays today's chat count, average first response time, and current active chat count
