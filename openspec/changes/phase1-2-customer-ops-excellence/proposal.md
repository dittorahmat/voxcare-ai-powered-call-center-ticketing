## Why

VoxCare has a functional ticketing and AI chat foundation, but critical gaps prevent it from being a production-ready customer experience platform. Customers cannot reply to existing tickets (only create and view), automation features are scaffolded but not executed (no cron triggers), and there is no self-service knowledge base for ticket deflection. Meanwhile, operational reporting (PDF exports, scheduled reports) exists as components but is not wired into any delivery mechanism. This change closes these gaps to deliver a complete Phase 1 + Phase 2 customer experience and operational excellence upgrade.

## What Changes

- **Customer Ticket Replies**: Customers can reply to their tickets with a conversation thread model (replacing the single `publicNotes` field), view full reply history, and attach files. Agents see customer replies in the ticket detail UI.
- **Cron Scheduler**: Cloudflare Cron Triggers configured to auto-execute: auto-close rule evaluation, CSAT reminders, CSAT cleanup, and scheduled report delivery.
- **PDF Reports + Scheduled Delivery**: PDF report components wired to a download endpoint. Scheduled report definitions connected to actual PDF generation + email delivery via SendGrid.
- **Customer Chat Auth Link**: Customer chat sessions linked to authenticated customer profile (name, email) instead of hardcoded "Customer" / null values.
- **Customer Notification Preferences**: Customers can configure which email notifications they receive and frequency (instant vs daily digest).
- **Knowledge Base**: Public-facing article library with search, categories, and tags. AI-suggested articles during ticket creation. Customer feedback on article helpfulness. Admin CRUD for article management.
- **AI Enhancement Suite**: AI auto-categorizes new tickets, suggests agent responses, analyzes customer sentiment, and flags negative sentiment for escalation.

## Capabilities

### New Capabilities

- `customer-ticket-replies`: Conversation thread model for customer-to-agent replies on tickets, including customer reply API, attachment support for customers, full thread timeline in customer and agent views, and agent notification on customer replies.
- `cron-automation`: Cloudflare Cron Trigger configuration and scheduled handler that executes auto-close evaluation, CSAT reminders/cleanup, and scheduled report delivery at configured intervals.
- `pdf-report-delivery`: PDF report generation endpoint, download UI, and automated email delivery of scheduled reports with PDF attachments via SendGrid.
- `customer-chat-identity`: Links customer chat sessions to authenticated customer profiles, persisting name and email. Updates embeddable widget to accept optional customer data.
- `customer-notification-preferences`: Customer-facing notification settings (per-event toggles, frequency selection) stored in customer model, respected by all email-sending code paths.
- `knowledge-base`: Public article library with CRUD (admin), search, categories, tags, AI-suggested articles during ticket creation, customer feedback (helpful/not helpful), and public-facing article view pages.
- `ai-assist-suite`: AI-powered auto-categorization of new tickets, suggested responses for agents, sentiment analysis on customer messages, and negative-sentiment escalation triggers.

### Modified Capabilities

<!-- No existing specs to modify — specs directory is empty -->

## Impact

- **Worker routes**: New endpoints for customer replies, knowledge base articles, AI assist, notification preferences, PDF reports. Modified cron handler.
- **Worker types**: New `TicketReply`, `KnowledgeArticle`, `CustomerNotificationPrefs`, `SentimentScore` types. Modified `Ticket` type (remove reliance on single `publicNotes`).
- **Worker services**: New `email-service` integration for cron-triggered report delivery. New AI tool definitions for auto-categorize, suggest-response, sentiment.
- **Frontend pages**: Modified `CustomerTicketDetailPage` (thread UI), `CustomerNewTicketPage` (article suggestions), `CustomerProfilePage` (notification prefs), `CustomerChatPage` (auth link), `TicketDetails` (agent-side reply view), `AnalyticsDashboard` (sentiment metrics).
- **Frontend new pages**: Knowledge Base public pages (article list, article detail, search), PDF report download page, customer notification settings page.
- **Frontend components**: New conversation thread component, AI suggestion panel, sentiment indicator badge, article suggestion widget, notification preferences form.
- **Database/storage**: New KV namespaces or Durable Object stores for `ticketReplies`, `knowledgeArticles`, `customerNotificationPrefs`, `sentimentScores`, `scheduledReportRuns`.
- **wrangler.jsonc**: New KV bindings, cron trigger configuration, updated secrets if needed.
