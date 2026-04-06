## 1. AI Tools (Backend)

- [ ] 1.1 Add `auto_categorize_ticket` tool definition to `worker/tools.ts` (takes title + description, returns suggested category + priority)
- [ ] 1.2 Add `analyze_sentiment` tool definition to `worker/tools.ts` (takes message text, returns score + label)
- [ ] 1.3 Add `suggest_response` tool definition to `worker/tools.ts` (takes ticket context, returns draft response)
- [ ] 1.4 Add `SentimentScore` interface to `worker/types.ts` with score, label, timestamp, messageId
- [ ] 1.5 Add `aiSuggestedCategory`, `aiSuggestedPriority`, `sentimentAlert`, `sentimentScores` fields to `Ticket` interface

## 2. AI Auto-Categorize (Backend)

- [ ] 2.1 Implement programmatic call to `auto_categorize_ticket` during `POST /api/tickets` (async, non-blocking)
- [ ] 2.2 Implement programmatic call to `auto_categorize_ticket` during `POST /api/customer/tickets` (async, non-blocking)
- [ ] 2.3 Store AI suggestion results in ticket's `aiSuggestedCategory` and `aiSuggestedPriority` fields
- [ ] 2.4 Ensure AI tools use `SystemSettings.aiConfig` for model, temperature, maxTokens

## 3. AI Sentiment Analysis (Backend)

- [ ] 3.1 Implement programmatic call to `analyze_sentiment` on every customer reply (async, non-blocking)
- [ ] 3.2 Store sentiment results in ticket's `sentimentScores` array
- [ ] 3.3 Implement negative sentiment flag: if score < -0.5, set `ticket.sentimentAlert = { score, label, timestamp }`
- [ ] 3.4 Create `GET /api/analytics/sentiment` endpoint for sentiment aggregation data

## 4. AI Response Suggestions (Backend)

- [ ] 4.1 Create `POST /api/ai/suggest-response/:ticketId` endpoint (agent+ only) that calls `suggest_response` tool and returns draft text
- [ ] 4.2 Add rate limiting (20 req/min per agent) to AI suggestion endpoint

## 5. AI Frontend

- [ ] 5.1 Add AI suggestion badge/icon to `TicketDetails` page showing `aiSuggestedCategory`/`aiSuggestedPriority` with "Accept" button
- [ ] 5.2 Add "AI Suggest" button in agent reply area that calls `POST /api/ai/suggest-response/:ticketId`
- [ ] 5.3 Display AI suggested response text in a suggestion panel with "Use" and "Dismiss" buttons
- [ ] 5.4 Add sentiment indicator badge to ticket header (red flag for negative, green for positive, gray for neutral)
- [ ] 5.5 Add sentiment metrics to `AnalyticsDashboard.tsx`: avg score, % negative, trend chart
- [ ] 5.6 Add sentiment trend line chart to analytics using Recharts
- [ ] 5.7 Update `CustomerNewTicketPage` to display AI-suggested KB articles (from ticket creation response)

## 6. Testing

- [ ] 6.1 Test AI auto-categorization: create tickets with various titles/descriptions, verify suggestions are reasonable
- [ ] 6.2 Test sentiment analysis: send positive, neutral, negative messages, verify correct scores and flags
- [ ] 6.3 Test AI response suggestion: verify suggestions are contextually appropriate for different ticket types
- [ ] 6.4 Build and verify no TypeScript compile errors: `bun run build`
- [ ] 6.5 Run linting: `bun run lint`
