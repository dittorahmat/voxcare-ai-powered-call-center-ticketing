## Why

AI in VoxCare is currently limited to a chat bot. Agents have no AI assistance for their core workflow — no auto-categorization of incoming tickets, no suggested responses, and no visibility into customer sentiment. This change adds three AI-powered capabilities that directly improve agent efficiency and ticket handling quality.

## What Changes

- Add AI auto-categorization of new tickets (async, non-blocking)
- Add AI suggested responses for agents (on-demand via "AI Suggest" button)
- Add sentiment analysis on every customer message with negative sentiment flag
- Add sentiment metrics to analytics dashboard
- Add AI suggestion badge/panel to agent ticket detail view

## Capabilities

### New Capabilities
- `ai-assist-suite`: AI-powered auto-categorization of new tickets, suggested responses for agents, sentiment analysis on customer messages, and negative-sentiment flagging. All using existing Cloudflare AI Gateway infrastructure.

### Modified Capabilities
<!-- None -->

## Impact

- **worker/tools.ts**: New tool definitions: `auto_categorize_ticket`, `analyze_sentiment`, `suggest_response`
- **worker/userRoutes.ts**: New `POST /api/ai/suggest-response/:ticketId` endpoint, modified ticket creation endpoints
- **worker/types.ts**: New `SentimentScore` type, `AISuggestion` type, additions to `Ticket` interface
- **src/pages/TicketDetails.tsx**: AI suggestion panel, sentiment indicator badge
- **src/pages/AnalyticsDashboard.tsx**: Sentiment metrics and trend chart
- **src/pages/CustomerNewTicketPage.tsx**: AI-suggested KB articles display
