## Context

VoxCare currently sends email notifications (via SendGrid) for ticket events without checking customer preferences. The `User` model has `notificationPrefs` for agents, but `Customer` model has no equivalent. All knowledge base functionality is absent — customers must create tickets for all inquiries.

Storage architecture: AppController DO SQLite for operational data, R2 for file attachments. KV namespaces are not yet in use. The KB will be the first KV-backed feature.

## Goals / Non-Goals

**Goals:**
- Give customers control over which emails they receive and when
- Provide self-service knowledge base to reduce ticket volume
- AI-suggested articles during ticket creation for deflection
- Public-facing KB pages (no auth required)

**Non-Goals:**
- No multi-language KB support (Bahasa Indonesia only, Phase 3)
- No vector/AI search for KB (keyword search only)
- No customer-side notification UI (email preferences only)
- No KB article versioning or history

## Decisions

### D1: KB Storage — KV vs. DO SQLite
**Decision:** Store KB articles in a new KV namespace (`KNOWLEDGE_BASE_KV`), not in AppController DO.

**Rationale:** Articles are read-heavy (public search/view), infrequent writes. KV is optimized for this pattern. Keeps DO lean. Key pattern: `kb:articles:{id}` + `kb:index` for search index.

### D2: Customer Notification Prefs — DO vs. KV
**Decision:** Store in AppController DO SQLite alongside Customer record.

**Rationale:** Tightly coupled to customer. Read during email-sending flow which already queries DO. No read-scale justification for KV.

### D3: Daily Digest Implementation
**Decision:** Queue notifications in DO storage per customer. Cron handler collects queued notifications and sends summary email at scheduled time.

**Rationale:** Simple queue model. No need for external queue service. DO persistence ensures no lost notifications.

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| KV eventual consistency (10s) for KB articles | Admin publishes, customer can't see immediately | Acceptable for KB. 5s cache busting on client. |
| Keyword search quality degrades at scale | Poor relevance for 500+ articles | Acceptable for Phase 2. Upgrade to vector search in Phase 3. |
| Daily digest queue grows unbounded if cron fails | Backlog of unprocessed notifications | Cron retry logic. Queue TTL for old notifications (7 days). |
