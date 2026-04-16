## Why

Customers have no control over email notifications — every ticket event triggers an email regardless of preference. Meanwhile, there is no self-service knowledge base for ticket deflection, forcing customers to create tickets for questions that could be answered by articles. Both features are essential for a mature customer experience platform.

## What Changes

- Add customer notification preferences (per-event toggles + instant/daily-digest frequency)
- Email sending code paths respect customer notification preferences
- Daily digest cron job collects and batches notifications for digest-mode customers
- Public knowledge base with article CRUD (admin), search, categories, tags
- AI-suggested articles during ticket creation
- Customer feedback (helpful/not-helpful) on KB articles
- Admin KB management settings page
- Public KB pages (`/kb`, `/kb/:id`) in Bahasa Indonesia

## Capabilities

### New Capabilities
- `customer-notification-preferences`: Customer-facing notification settings (per-event toggles, frequency selection) stored in customer model, respected by all email-sending code paths, with daily digest batching.
- `knowledge-base`: Public article library with CRUD (admin), search, categories, tags, AI-suggested articles during ticket creation, customer feedback (helpful/not helpful), and public-facing article view pages. All articles in Bahasa Indonesia.

### Modified Capabilities
<!-- None -->

## Impact

- **worker/types.ts**: New `CustomerNotificationPrefs` type, `notificationPrefs` on `Customer`, `KnowledgeArticle` type
- **worker/app-controller.ts**: Customer notification prefs methods
- **worker/userRoutes.ts**: 8 new endpoints (notification prefs GET/PATCH, KB CRUD, KB search, KB feedback)
- **worker/email-service.ts**: Check customer notification prefs before sending
- **New KV namespace**: `KNOWLEDGE_BASE_KV` for article storage
- **wrangler.jsonc**: KV binding, cron trigger for daily digest
- **src/pages/Settings/KnowledgeBaseSettings.tsx**: New admin page
- **src/pages/KnowledgeBase.tsx**: New public KB listing page
- **src/pages/KnowledgeBaseArticle.tsx**: New public article detail page
- **src/components/settings/NotificationPreferencesForm.tsx**: New component
- **src/pages/CustomerProfilePage.tsx**: Add notification prefs section
- **src/main.tsx**: Add public routes for `/kb` and `/kb/:id`
