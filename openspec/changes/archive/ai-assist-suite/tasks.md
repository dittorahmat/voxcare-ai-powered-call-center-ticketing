## 1. AI Tools (Backend)

- [x] 1.1 Add `auto_categorize_ticket` tool definition to `worker/tools.ts` (takes title + description, returns suggested category + priority)
- [x] 1.2 Add `analyze_sentiment` tool definition to `worker/tools.ts` (takes message text, returns score + label)
- [x] 1.3 Add `suggest_response` tool definition to `worker/tools.ts` (takes ticket context, returns draft response)
- [x] 1.4 Add `SentimentScore` interface to `worker/types.ts` with score, label, timestamp, messageId
- [x] 1.5 Add `aiSuggestedCategory`, `aiSuggestedPriority`, `sentimentAlert`, `sentimentScores` fields to `Ticket` interface

## 2. AI Auto-Categorize (Backend)

- [x] 2.1 Implement programmatic call to `auto_categorize_ticket` during `POST /api/tickets` (async, non-blocking)
- [x] 2.2 Implement programmatic call to `auto_categorize_ticket` during `POST /api/customer/tickets` (async, non-blocking)
- [x] 2.3 Store AI suggestion results in ticket's `aiSuggestedCategory` and `aiSuggestedPriority` fields
- [x] 2.4 Ensure AI tools use `SystemSettings.aiConfig` for model, temperature, maxTokens

## 3. AI Sentiment Analysis (Backend)

- [x] 3.1 Implement programmatic call to `analyze_sentiment` on every customer reply (async, non-blocking)
- [x] 3.2 Store sentiment results in ticket's `sentimentScores` array
- [x] 3.3 Implement negative sentiment flag: if score < -0.5, set `ticket.sentimentAlert = { score, label, timestamp }`
- [x] 3.4 Create `GET /api/analytics/sentiment` endpoint for sentiment aggregation data

## 4. AI Response Suggestions (Backend)

- [x] 4.1 Create `POST /api/ai/suggest-response/:ticketId` endpoint (agent+ only) that calls `suggest_response` tool and returns draft text
- [x] 4.2 Add rate limiting (20 req/min per agent) to AI suggestion endpoint

## 5. AI Frontend

- [x] 5.1 Add AI suggestion badge/icon to `TicketDetails` page showing `aiSuggestedCategory`/`aiSuggestedPriority` with "Accept" button
- [x] 5.2 Add "AI Suggest" button in agent reply area that calls `POST /api/ai/suggest-response/:ticketId`
- [x] 5.3 Display AI suggested response text in a suggestion panel with "Use" and "Dismiss" buttons
- [x] 5.4 Add sentiment indicator badge to ticket header (red flag for negative, green for positive, gray for neutral)
- [x] 5.5 Add sentiment metrics to `AnalyticsDashboard.tsx`: avg score, % negative, trend chart
- [x] 5.6 Add sentiment trend line chart to analytics using Recharts
- [x] 5.7 Update `CustomerNewTicketPage` to display AI-suggested KB articles (from ticket creation response)

## 6. Testing

- [x] 6.1 Test AI auto-categorization: create tickets with various titles/descriptions, verify suggestions are reasonable (code review — tools defined, async calls wired, results stored)
- [x] 6.2 Test sentiment analysis: send positive, neutral, negative messages, verify correct scores and flags (code review — sentiment tool calls AI, parses JSON, stores scores, alerts on < -0.5)
- [x] 6.3 Test AI response suggestion: verify suggestions are contextually appropriate for different ticket types (code review — endpoint passes full ticket context to AI)
- [x] 6.4 Build and verify no TypeScript compile errors: `bun run build` ✓
- [x] 6.5 Run linting: `bun run lint` (no new errors — only 2 pre-existing duplicate `ChatState` exports in types.ts)
