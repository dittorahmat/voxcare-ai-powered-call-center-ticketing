## 1. Customer Notification Preferences (Backend)

- [ ] 1.1 Add `CustomerNotificationPrefs` interface to `worker/types.ts` with events map and frequency field
- [ ] 1.2 Add `notificationPrefs` field to `Customer` interface in `worker/types.ts`
- [ ] 1.3 Add `GET /api/customer/notification-preferences` endpoint in `worker/userRoutes.ts`
- [ ] 1.4 Add `PATCH /api/customer/notification-preferences` endpoint in `worker/userRoutes.ts`
- [ ] 1.5 Initialize default `notificationPrefs` (all events enabled, frequency: instant) in customer registration flow
- [ ] 1.6 Update email sending code paths (ticket-created, ticket-updated, ticket-resolved) to check customer `notificationPrefs` before sending
- [ ] 1.7 Implement daily digest queue: when customer frequency is `daily-digest`, queue notifications instead of sending immediately
- [ ] 1.8 Add daily digest cron job to `scheduled()` handler (collects queued notifications per customer, sends summary email)

## 2. Customer Notification Preferences (Frontend)

- [ ] 2.1 Create notification preferences form component (`src/components/settings/NotificationPreferencesForm.tsx`) with per-event toggles and frequency selector
- [ ] 2.2 Add notification preferences section to `CustomerProfilePage.tsx`
- [ ] 2.3 Wire form to `GET/PATCH /api/customer/notification-preferences` endpoints
- [ ] 2.4 Add loading states, success/error toasts for preference save

## 3. Knowledge Base (Backend)

- [ ] 3.1 Create KV namespace via `wrangler kv namespace create` and add binding to wrangler.jsonc
- [ ] 3.2 Add `KnowledgeArticle` interface to `worker/types.ts`
- [ ] 3.3 Implement KV storage functions: `storeArticle()`, `getArticle()`, `listArticles()`, `deleteArticle()`, `updateIndex()`
- [ ] 3.4 Create `POST /api/knowledge-base/articles` endpoint (admin only) with validation
- [ ] 3.5 Create `PUT /api/knowledge-base/articles/:id` endpoint (admin only)
- [ ] 3.6 Create `DELETE /api/knowledge-base/articles/:id` endpoint (admin only)
- [ ] 3.7 Create `GET /api/knowledge-base/articles` endpoint (public) with `category`, `tag`, and `search` query params
- [ ] 3.8 Create `GET /api/knowledge-base/articles/:id` endpoint (public, 404 for drafts to non-admin)
- [ ] 3.9 Implement keyword search over article titles, content snippets, and tags
- [ ] 3.10 Create `POST /api/knowledge-base/articles/:id/feedback` endpoint (public) for helpful/not-helpful votes
- [ ] 3.11 Implement AI article suggestion: on ticket creation, search KB for matching articles by title/description keywords
- [ ] 3.12 Add `helpfulCount` and `notHelpfulCount` tracking to article metadata in KV

## 4. Knowledge Base (Frontend)

- [ ] 4.1 Create admin KB management page (`src/pages/Settings/KnowledgeBaseSettings.tsx`) with article list, create/edit form, publish toggle
- [ ] 4.2 Add rich text editor for article content (use existing textarea with Markdown)
- [ ] 4.3 Add category selector and tag input to KB article form
- [ ] 4.4 Create public KB listing page (`/kb`) with search bar, category filters, and article cards
- [ ] 4.5 Create public KB article detail page (`/kb/:id`) with full content rendering, helpful/not-helpful buttons
- [ ] 4.6 Add article suggestion widget to `CustomerNewTicketPage` that shows matching KB articles as customer types
- [ ] 4.7 Add public routes for `/kb` and `/kb/:id` in `src/main.tsx` router (no auth required)
- [ ] 4.8 Style public KB pages with clean, accessible design (separate from admin UI)

## 5. Testing

- [ ] 5.1 Test notification preferences: verify disabled events do NOT trigger emails
- [ ] 5.2 Test knowledge base CRUD: create, publish, search, view, feedback
- [ ] 5.3 Build and verify no TypeScript compile errors: `bun run build`
- [ ] 5.4 Run linting: `bun run lint`
