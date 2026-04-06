## 1. Infrastructure & Configuration

- [ ] 1.1 Create `KNOWLEDGE_BASE_KV` KV namespace via `wrangler kv namespace create` and record binding name
- [ ] 1.2 Update `wrangler.jsonc` to add KV binding for `KNOWLEDGE_BASE_KV`
- [ ] 1.3 Update `wrangler.jsonc` to add `triggers.crons` array with 4 cron expressions (auto-close, CSAT reminder, CSAT cleanup, scheduled reports)
- [ ] 1.4 Update `worker/types.ts` to add new types: `TicketReply`, `KnowledgeArticle`, `CustomerNotificationPrefs`, `SentimentScore`, `AISuggestion`
- [ ] 1.5 Update AppController DO migration tag in `wrangler.jsonc` for schema changes (replies, notificationPrefs, sentiment fields)
- [ ] 1.6 Add `replies: TicketReply[]` field to `Ticket` interface in `worker/types.ts`
- [ ] 1.7 Add `notificationPrefs` and `aiSuggestedCategory`/`aiSuggestedPriority`/`sentimentAlert` fields to `Ticket` interface
- [ ] 1.8 Add `notificationPrefs` field to `Customer` interface in `worker/types.ts`
- [ ] 1.9 Add `sentimentScores` array field to `Ticket` interface

## 2. Customer Ticket Replies (Backend)

- [ ] 2.1 Add `POST /api/customer/tickets/:id/replies` endpoint in `worker/userRoutes.ts` with customer auth middleware
- [ ] 2.2 Add `GET /api/customer/tickets/:id/replies` endpoint for customer to view their ticket thread
- [ ] 2.3 Add `POST /api/tickets/:id/replies` endpoint for agent replies (requires agent/supervisor/admin role)
- [ ] 2.4 Add `GET /api/tickets/:id/replies` endpoint for agent to view full thread
- [ ] 2.5 Implement `addTicketReply()` method in AppController DO that appends to `Ticket.replies[]` array
- [ ] 2.6 Implement reply creation logic: update `lastCustomerReplyAt` and `updatedAt` on ticket when customer replies
- [ ] 2.7 Implement notification creation for assigned agent (or all available agents if unassigned) on customer reply
- [ ] 2.8 Implement email notification to agent on customer reply (respecting agent's `notificationPrefs.emailEnabled`)
- [ ] 2.9 Add customer file attachment upload for replies via `POST /api/customer/tickets/:id/replies/attachments` (R2 storage, 10MB limit)
- [ ] 2.10 Write migration script to convert existing `publicNotes` to first entry in `replies[]` array for all tickets
- [ ] 2.11 Add rate limiting (10 replies/minute per ticket) to customer reply endpoint

## 3. Customer Ticket Replies (Frontend)

- [ ] 3.1 Create `ConversationThread` component (`src/components/tickets/ConversationThread.tsx`) that displays replies chronologically with sender badges
- [ ] 3.2 Update `CustomerTicketDetailPage` (`src/pages/CustomerTicketDetailPage.tsx`) to use `ConversationThread` instead of single `publicNotes` display
- [ ] 3.3 Add reply input form to `CustomerTicketDetailPage` with text area + file upload button
- [ ] 3.4 Update `TicketDetails` (`src/pages/TicketDetails.tsx`) agent view to use `ConversationThread` for full thread display
- [ ] 3.5 Add agent reply input form to `TicketDetails` page
- [ ] 3.6 Add visual indicator for customer vs agent replies (color-coded sender badges)
- [ ] 3.7 Wire file attachment upload in customer reply form to R2 endpoint
- [ ] 3.8 Display attachment thumbnails/file links in conversation thread

## 4. Cron Scheduler (Backend)

- [ ] 4.1 Add `scheduled()` handler in `worker/index.ts` that catches cron trigger events
- [ ] 4.2 Implement auto-close evaluation call within `scheduled()` handler (calls AppController auto-close logic every 30 min)
- [ ] 4.3 Implement CSAT reminder logic within `scheduled()` handler (finds resolved 24-48h tickets without CSAT, sends email every 6h)
- [ ] 4.4 Implement CSAT cleanup logic within `scheduled()` handler (deletes CSAT responses >90 days old, daily at 3am)
- [ ] 4.5 Implement scheduled report delivery logic within `scheduled()` handler (evaluates enabled reports, generates HTML, emails recipients, hourly)
- [ ] 4.6 Add error handling: each job wrapped in try/catch, failures logged, other jobs continue
- [ ] 4.7 Add observability logging: cron start, each job start/result, cron end
- [ ] 4.8 Implement `nextRunAt` calculation logic for daily and weekly scheduled reports
- [ ] 4.9 Wire `POST /api/auto-close/evaluate` to call the same internal function as the cron handler (D1: unified logic)

## 5. PDF Report Delivery

- [ ] 5.1 Add `BROWSER_RENDERING_API_URL` and `BROWSER_RENDERING_API_KEY` to wrangler.jsonc vars (or as secrets)
- [ ] 5.2 Create `GET /api/reports/:type/pdf` endpoint in `worker/userRoutes.ts` (requires supervisor/admin role)
- [ ] 5.3 Build HTML report template functions (`generateTicketSummaryHTML()`, `generateSLAComplianceHTML()`, `generateAgentPerformanceHTML()`) with clean table layout and metrics
- [ ] 5.4 Implement PDF generation: POST HTML to Cloudflare Browser Rendering API `/pdf` endpoint, return PDF blob with `Content-Type: application/pdf`
- [ ] 5.5 Implement fallback: if Browser Rendering API fails, return HTML report as `text/html`
- [ ] 5.6 Add date range filtering (`?from=` and `?to=` query params) to report endpoint
- [ ] 5.7 Implement HTML email report generation function for scheduled report delivery (tables + metrics, no PDF dependency)
- [ ] 5.8 Update scheduled report cron handler to call HTML email generation and send via SendGrid
- [ ] 5.9 Add "View in Dashboard" link and "Download PDF" link to scheduled report email footer
- [ ] 5.10 Create frontend report download page or add download buttons to `AnalyticsDashboard.tsx`

## 6. Customer Chat Identity

- [ ] 6.1 Update `CustomerChatPage.tsx` to read authenticated customer from `CustomerAuthContext`
- [ ] 6.2 Pass `customerId`, `customerName`, `customerEmail` to `POST /api/chat-sessions` call in `CustomerChatPage.tsx`
- [ ] 6.3 Verify worker `POST /api/chat-sessions` endpoint correctly stores all three fields (confirm existing behavior)
- [ ] 6.4 Add `GET /api/customer/chat-sessions` endpoint for authenticated customer to list their past chat sessions
- [ ] 6.5 Update agent chat queue UI to display customer name and email (when available) for each session
- [ ] 6.6 Update embeddable widget (`src/widget/chat-widget.ts`) to accept `data-customer-name` and `data-customer-email` script attributes
- [ ] 6.7 Ensure ticket escalation preserves `customerId` from chat session to created ticket

## 7. Customer Notification Preferences (Backend)

- [ ] 7.1 Add `GET /api/customer/notification-preferences` endpoint in `worker/userRoutes.ts`
- [ ] 7.2 Add `PATCH /api/customer/notification-preferences` endpoint in `worker/userRoutes.ts`
- [ ] 7.3 Initialize default `notificationPrefs` (all events enabled, frequency: instant) in customer registration flow
- [ ] 7.4 Update email sending code paths (ticket-created, ticket-updated, ticket-resolved) to check customer `notificationPrefs` before sending
- [ ] 7.5 Implement daily digest queue: when customer frequency is `daily-digest`, queue notifications instead of sending immediately
- [ ] 7.6 Add daily digest cron job to `scheduled()` handler (collects queued notifications per customer, sends summary email)

## 8. Customer Notification Preferences (Frontend)

- [ ] 8.1 Create notification preferences form component (`src/components/settings/NotificationPreferencesForm.tsx`) with per-event toggles and frequency selector
- [ ] 8.2 Add notification preferences section to `CustomerProfilePage.tsx` or create dedicated settings page
- [ ] 8.3 Wire form to `GET/PATCH /api/customer/notification-preferences` endpoints
- [ ] 8.4 Add loading states, success/error toasts for preference save

## 9. Knowledge Base (Backend)

- [ ] 9.1 Create `POST /api/knowledge-base/articles` endpoint (admin only) with validation
- [ ] 9.2 Create `PUT /api/knowledge-base/articles/:id` endpoint (admin only)
- [ ] 9.3 Create `DELETE /api/knowledge-base/articles/:id` endpoint (admin only)
- [ ] 9.4 Create `GET /api/knowledge-base/articles` endpoint (public) with `category`, `tag`, and `search` query params
- [ ] 9.5 Create `GET /api/knowledge-base/articles/:id` endpoint (public, 404 for drafts to non-admin)
- [ ] 9.6 Implement KV storage functions: `storeArticle()`, `getArticle()`, `listArticles()`, `deleteArticle()`, `updateIndex()`
- [ ] 9.7 Implement keyword search over article titles, content snippets, and tags (client-side ranking for <500 articles)
- [ ] 9.8 Create `POST /api/knowledge-base/articles/:id/feedback` endpoint (public) for helpful/not-helpful votes
- [ ] 9.9 Implement AI article suggestion: on ticket creation, search KB for matching articles by title/description keywords, return as `suggestedArticles` in response
- [ ] 9.10 Add `helpfulCount` and `notHelpfulCount` tracking to article metadata in KV

## 10. Knowledge Base (Frontend)

- [ ] 10.1 Create admin KB management page (`src/pages/Settings/KnowledgeBaseSettings.tsx`) with article list, create/edit form, publish toggle
- [ ] 10.2 Add rich text editor for article content (use existing textarea with Markdown or add a simple rich text library)
- [ ] 10.3 Add category selector and tag input to KB article form
- [ ] 10.4 Create public KB listing page (`/kb`) with search bar, category filters, and article cards
- [ ] 10.5 Create public KB article detail page (`/kb/:id`) with full content rendering, helpful/not-helpful buttons
- [ ] 10.6 Add article suggestion widget to `CustomerNewTicketPage` that shows matching KB articles as customer types
- [ ] 10.7 Add public route for `/kb` and `/kb/:id` in `src/main.tsx` router (no auth required)
- [ ] 10.8 Style public KB pages with clean, accessible design (separate from admin UI)

## 11. AI Assist Suite (Backend)

- [ ] 11.1 Add `auto_categorize_ticket` tool definition to `worker/tools.ts` (takes title + description, returns suggested category + priority)
- [ ] 11.2 Add `analyze_sentiment` tool definition to `worker/tools.ts` (takes message text, returns score + label)
- [ ] 11.3 Add `suggest_response` tool definition to `worker/tools.ts` (takes ticket context, returns draft response)
- [ ] 11.4 Implement programmatic call to `auto_categorize_ticket` during `POST /api/tickets` and `POST /api/customer/tickets` (async, non-blocking)
- [ ] 11.5 Store AI suggestion results in ticket's `aiSuggestedCategory` and `aiSuggestedPriority` fields
- [ ] 11.6 Implement programmatic call to `analyze_sentiment` on every customer reply (async, non-blocking)
- [ ] 11.7 Store sentiment results in ticket's `sentimentScores` array
- [ ] 11.8 Implement negative sentiment flag: if score < -0.5, set `ticket.sentimentAlert = { score, label, timestamp }`
- [ ] 11.9 Create `POST /api/ai/suggest-response/:ticketId` endpoint (agent+ only) that calls `suggest_response` tool and returns draft text
- [ ] 11.10 Add rate limiting (20 req/min per agent) to AI suggestion endpoint
- [ ] 11.11 Create `GET /api/analytics/sentiment` endpoint for sentiment aggregation data
- [ ] 11.12 Ensure all AI tools use `SystemSettings.aiConfig` for model, temperature, maxTokens

## 12. AI Assist Suite (Frontend)

- [ ] 12.1 Add AI suggestion badge/icon to `TicketDetails` page showing `aiSuggestedCategory`/`aiSuggestedPriority` with "Accept" button
- [ ] 12.2 Add "AI Suggest" button in agent reply area that calls `POST /api/ai/suggest-response/:ticketId`
- [ ] 12.3 Display AI suggested response text in a suggestion panel with "Use" and "Dismiss" buttons
- [ ] 12.4 Add sentiment indicator badge to ticket header (red flag for negative, green for positive, gray for neutral)
- [ ] 12.5 Add sentiment metrics to `AnalyticsDashboard.tsx`: avg score, % negative, trend chart
- [ ] 12.6 Add sentiment trend line chart to analytics using Recharts
- [ ] 12.7 Update `CustomerNewTicketPage` to display AI-suggested KB articles (from ticket creation response)

## 13. Testing & Verification

- [ ] 13.1 Test customer reply flow end-to-end: customer replies → agent sees it → agent replies → customer sees it
- [ ] 13.2 Test migration script: verify existing `publicNotes` correctly converted to `replies[]` entries
- [ ] 13.3 Test cron execution: verify all 4 cron jobs execute and log correctly (use `wrangler dev` local cron simulation)
- [ ] 13.4 Test PDF download endpoint: verify PDF is generated via Browser Rendering API or HTML fallback is returned correctly
- [ ] 13.5 Test scheduled report delivery: manually trigger cron handler and verify email sent via SendGrid
- [ ] 13.6 Test customer chat identity: verify authenticated customer's name/email appears in chat session and agent queue
- [ ] 13.7 Test notification preferences: verify disabled events do NOT trigger emails
- [ ] 13.8 Test knowledge base CRUD: create, publish, search, view, feedback
- [ ] 13.9 Test AI auto-categorization: create tickets with various titles/descriptions, verify suggestions are reasonable
- [ ] 13.10 Test sentiment analysis: send positive, neutral, negative messages, verify correct scores and flags
- [ ] 13.11 Test AI response suggestion: verify suggestions are contextually appropriate for different ticket types
- [ ] 13.12 Build and verify no TypeScript compile errors: `bun run build`
- [ ] 13.13 Run linting: `bun run lint`
