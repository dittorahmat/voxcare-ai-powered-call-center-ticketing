# ai-assist-suite Specification

## Purpose
TBD - created by archiving change phase1-2-customer-ops-excellence. Update Purpose after archive.
## Requirements
### Requirement: AI auto-categorizes new tickets
The system SHALL automatically suggest a category and priority for new tickets by sending the ticket title and description to the AI model. Suggestions SHALL be stored in the ticket record and SHALL be overrideable by agents.

#### Scenario: Ticket created with AI suggestion
- **WHEN** a ticket is created via `POST /api/tickets` or `POST /api/customer/tickets`
- **THEN** the AI is called asynchronously with `{ title, description }` and the suggested `category` and `priority` are stored in `ticket.aiSuggestedCategory` and `ticket.aiSuggestedPriority`

#### Scenario: Agent overrides AI suggestion
- **WHEN** agent changes the ticket category or priority
- **THEN** the agent's selection takes precedence and the AI suggestion is retained for audit purposes

### Requirement: AI analyzes sentiment on customer messages
The system SHALL analyze the sentiment of every customer reply and chat message. The sentiment result (score: -1.0 to +1.0, label: "negative" | "neutral" | "positive") SHALL be stored and associated with the message.

#### Scenario: Customer sends negative message
- **WHEN** customer replies with "This is absolutely terrible, I've been waiting for days!"
- **THEN** sentiment analysis returns `{ score: -0.8, label: "negative" }` and is stored with the reply

#### Scenario: Sentiment analysis is non-blocking
- **WHEN** a customer reply is received
- **THEN** the sentiment analysis is called asynchronously and does NOT delay the reply being stored or notifications being sent

### Requirement: Negative sentiment triggers agent flag
When a customer message has a negative sentiment score below -0.5, the system SHALL flag the ticket with a `sentimentAlert` indicator visible in the agent UI. The system SHALL NOT automatically change the ticket priority based on sentiment (escalation deferred to Phase 3).

#### Scenario: Negative sentiment flag displayed
- **WHEN** a customer reply has sentiment score < -0.5
- **THEN** the ticket detail page shows a visual indicator (e.g., red flag icon) alerting the agent to negative customer sentiment

### Requirement: AI suggests agent responses
The system SHALL provide a `POST /api/ai/suggest-response/:ticketId` endpoint that generates a draft response for an agent based on the ticket context (title, description, conversation history, category).

#### Scenario: Agent requests AI suggestion
- **WHEN** agent clicks "AI Suggest" on a ticket detail page
- **THEN** the system calls the AI with ticket context and returns a suggested response text within 5 seconds

#### Scenario: AI suggestion displayed in separate panel
- **WHEN** the AI returns a suggested response
- **THEN** the suggestion is displayed in a separate panel below the reply editor with "Use" and "Dismiss" buttons. The suggestion is NOT auto-inserted into the reply editor.

#### Scenario: AI suggestion respects ticket context
- **WHEN** AI generates a suggestion for a technical support ticket
- **THEN** the suggestion is contextually appropriate for the ticket's category, status, and conversation history

### Requirement: AI suggestion endpoint requires authentication
The `POST /api/ai/suggest-response/:ticketId` endpoint SHALL require agent, supervisor, or admin role.

#### Scenario: Customer attempts to use AI suggestion
- **WHEN** a customer-role user calls `POST /api/ai/suggest-response/:ticketId`
- **THEN** the system returns 403 Forbidden

### Requirement: Sentiment data available in analytics
The system SHALL aggregate sentiment data and make it available in the analytics dashboard, including: average sentiment score over time, sentiment distribution (negative/neutral/positive %), and correlation with CSAT ratings.

#### Scenario: Analytics dashboard shows sentiment metrics
- **WHEN** supervisor views analytics dashboard
- **THEN** they see: avg sentiment score, % negative messages, and trend chart of sentiment over the selected date range

### Requirement: AI tools defined in worker/tools.ts
All AI assist capabilities (auto_categorize_ticket, analyze_sentiment, suggest_response) SHALL be implemented as tool definitions in `worker/tools.ts` following the existing tool pattern, callable via the Cloudflare AI Gateway.

#### Scenario: Tool definitions registered
- **WHEN** the worker starts
- **THEN** `auto_categorize_ticket`, `analyze_sentiment`, and `suggest_response` tools are available with proper parameter schemas

### Requirement: AI assist respects AI system settings
AI assist features SHALL use the model, temperature, and maxTokens settings from `SystemSettings.aiConfig`.

#### Scenario: Admin changes AI model
- **WHEN** admin changes the AI model in `/settings/ai` from "Gemini 2.5 Flash" to "Gemini 2.5 Pro"
- **THEN** all AI assist features (auto-categorize, sentiment, suggest-response) use the new model for subsequent calls

### Requirement: Rate limiting on AI suggestion endpoint
The `POST /api/ai/suggest-response/:ticketId` endpoint SHALL be rate-limited to 20 requests per minute per agent to prevent AI cost abuse.

#### Scenario: Agent exceeds AI suggestion rate limit
- **WHEN** an agent makes more than 20 AI suggestion requests in 1 minute
- **THEN** the system returns 429 Too Many Requests

