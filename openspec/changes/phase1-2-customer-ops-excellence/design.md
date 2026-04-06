## Context

VoxCare is a Cloudflare Workers-based AI-powered call center ticketing platform built with Hono (backend), React (frontend), and Cloudflare Durable Objects (state). The current architecture uses:

- **AppController** (Durable Object with SQLite): Stores tickets, users, customers, SLA records, notifications, settings, and all operational data in a single SQLite-backed DO.
- **KV Namespaces**: Currently none in use — all state lives in the AppController DO.
- **R2 Bucket**: `voxcare-attachments` for file attachments.
- **SSE**: Server-Sent Events for real-time notifications.
- **AI**: Cloudflare AI Gateway with Gemini models, tool-calling architecture via `worker/tools.ts`.

**Current gaps this change addresses:**
1. Customer ticket interaction is one-way (create + view only, no replies)
2. Automation endpoints exist but no cron trigger executes them
3. PDF report components exist but are not wired to any route
4. Customer chat sessions are anonymous (not linked to auth profile)
5. No knowledge base or self-service deflection
6. No AI assist for agents (auto-categorize, suggest responses, sentiment)

**Constraints:**
- Must work within Cloudflare Workers limits (KV 25MB value limit, DO SQLite limits)
- Cannot add external databases — must use existing DO + KV + R2 architecture
- AI must use existing Cloudflare AI Gateway (no separate OpenAI key)
- Must maintain backward compatibility with existing ticket data (publicNotes migration)

## Goals / Non-Goals

**Goals:**
- Enable two-way customer-agent conversation threads on tickets
- Automate all scheduled tasks via Cloudflare Cron Triggers
- Wire PDF reports and enable scheduled email delivery
- Link customer chat sessions to authenticated profiles
- Provide customer notification preference controls
- Deploy a public knowledge base with AI-assisted article suggestions
- Add AI auto-categorization, suggested responses, and sentiment analysis

**Non-Goals:**
- No telephony/FreeSWITCH integration (separate initiative)
- No multi-channel (WhatsApp, SMS, social media) — phase 3
- No custom workflow automation builder (separate large initiative)
- No mobile app
- No real-time co-browsing or screen sharing

## Decisions

### D1: Conversation Model — Reply Threads vs. Replacing publicNotes

**Decision:** Replace the single `publicNotes: PublicNote | null` field with a `replies: TicketReply[]` array. The `publicNotes` field is deprecated but kept for backward compatibility during migration.

**Rationale:** A flat array of replies (from both agents and customers) provides a clean conversation timeline. The existing `publicNotes` is insufficient — it's a single note, not a thread.

**Alternatives considered:**
- *Separate DO for replies*: Overkill. The AppController DO already handles tickets with arrays (internalNotes, attachments, tags). Adding replies as another array is consistent.
- *External conversation service*: Unnecessary complexity for a single-tenant Workers app.

**Migration:** On first deploy, existing `publicNotes` on each ticket is converted into the first entry in `replies[]`. The field is nulled out but not deleted from the schema.

### D2: Cron Triggers — Cloudflare Native vs. External Scheduler

**Decision:** Use Cloudflare Cron Triggers (`triggers.crons` in wrangler.jsonc) with a `scheduled()` handler in worker/index.ts.

**Rationale:** Native Cloudflare solution, zero infra cost, integrates directly with existing endpoints. The existing POST endpoints (`/api/auto-close/evaluate`, `/api/csat/reminder`, etc.) can be called internally from the `scheduled()` handler.

**Alternatives considered:**
- *GitHub Actions cron*: Would need Worker API + auth overhead.
- *External cron service (Cron-job.org)*: Adds external dependency.
- *Durable Object scheduled tick*: Would require a always-on DO, more complex.

**Schedule:**
| Job | Frequency | Cron Expression |
|-----|-----------|-----------------|
| Auto-close evaluate | Every 30 min | `*/30 * * * *` |
| CSAT reminder | Every 6 hours | `0 */6 * * *` |
| CSAT cleanup | Daily at 3am | `0 3 * * *` |
| Scheduled report delivery | Every 1 hour | `0 * * * *` |

### D3: PDF Report Delivery — Server-Side Rendering vs. Client-Side

**Decision:** Generate PDFs server-side using the existing `@react-pdf/renderer` components. The worker endpoint renders the React component to a PDF blob via `renderToBuffer()`, then either returns it as a download or attaches it to a SendGrid email.

**Rationale:** The PDF components already exist (`src/components/reports/PdfReports.tsx`). The challenge is that Cloudflare Workers cannot run React server-side rendering natively.

**Actually — correction:** Cloudflare Workers **cannot** run `@react-pdf/renderer` (which depends on Puppeteer/React DOM) in the edge runtime. We need a different approach.

**Revised Decision:** Use the Cloudflare Worker to generate PDFs via a **service call to a rendering endpoint**. Since we're on Cloudflare Workers, the practical approach is:

1. **Option A — Renderless PDF**: Generate PDF content as HTML/CSS, then use a Cloudflare Worker with `@react-pdf/renderer` running in a **Node.js-compatible** environment (via `nodejs_compat` flag, which is already enabled). `@react-pdf/renderer` v4 supports React 18 and may work with nodejs_compat.

2. **Option B — HTML Email Fallback**: For scheduled reports, generate a rich HTML email body (tables, charts as base64 images from the analytics data) and send via SendGrid. Offer PDF download only when accessed from the web UI (client-side generates via browser).

**Final Decision:** Go with **Option B (HTML Email + client-side PDF)**. Server-side generates HTML report emails for scheduled delivery. The PDF download button in the UI triggers client-side PDF generation (the existing `@react-pdf/renderer` components work in the browser). For server-side PDF on Cloudflare Workers, we'll attempt Option A first with `nodejs_compat`, and if it fails due to missing native modules, fall back to HTML-only.

**This is a risk — see Risks section.**

### D4: Knowledge Base Storage — KV vs. DO SQLite

**Decision:** Store knowledge base articles in a **new KV namespace** (`KNOWLEDGE_BASE_KV`), not in the AppController DO.

**Rationale:**
- Articles are read-heavy (public search/view), infrequent writes (admin CRUD)
- KV is optimized for read-heavy workloads
- Keeps the AppController DO lean
- Full-text search can be done client-side for small article sets (<500), or via a simple keyword index stored alongside each article
- If articles grow large, each article is a separate KV key (well under 25MB limit)

**Key pattern:** `kb:articles:{id}` for articles, `kb:index` for search index array.

**Alternatives considered:**
- *DO SQLite*: Would add load to the single DO. Article reads don't need transactional consistency with ticket data.
- *R2*: Overkill for text articles. Better for file attachments.
- *Vector DB (for AI search)*: Overkill for Phase 2. Simple keyword search + AI-suggested articles is sufficient.

### D5: AI Assist — Inline API Calls vs. Tool-Calling Architecture

**Decision:** Add new AI "tools" to the existing `worker/tools.ts` architecture for:
- `auto_categorize_ticket`: Takes title + description, returns suggested category + priority
- `analyze_sentiment`: Takes message text, returns sentiment score (-1 to +1) and label
- `suggest_response`: Takes ticket context, returns draft response text

These tools are called **programmatically** by the worker (not by the AI chat bot) at specific trigger points:
- Auto-categorize: Called during `POST /api/customer/tickets` and `POST /api/tickets`
- Sentiment: Called on every customer reply/message, stored in ticket metadata
- Suggest response: Called via explicit `POST /api/ai/suggest-response/:ticketId` when agent clicks "AI Suggest"

**Rationale:** Reuses existing AI infrastructure (Cloudflare AI Gateway, OpenAI SDK integration). Keeps AI logic centralized in `worker/tools.ts`.

**Alternatives considered:**
- *Separate AI service*: Unnecessary — the AI gateway already supports multiple models.
- *Edge AI function per feature*: Would duplicate AI client setup code.

### D6: Customer Notification Preferences — KV vs. DO Storage

**Decision:** Store in **AppController DO SQLite** alongside the Customer record, not in separate KV.

**Rationale:** Customer notification preferences are tightly coupled to the customer record. Reading them is part of the email-sending flow which already queries the DO. No read-scale justification for KV separation.

### D7: Customer Chat Identity — Minimal Change

**Decision:** In `CustomerChatPage.tsx`, read the authenticated customer from `CustomerAuthContext` and pass `customerName` + `customerEmail` to `POST /api/chat-sessions`. On the worker side, the route already accepts these fields — just need the frontend to send them.

**Rationale:** The backend already supports `customerId`, `customerName`, `customerEmail` in the `POST /api/chat-sessions` endpoint. The only change is frontend — read from auth context instead of hardcoding.

### D8: Scheduled Report Execution — Centralized Handler

**Decision:** Single `scheduled()` handler in `worker/index.ts` that:
1. Fetches all enabled scheduled reports from AppController
2. Filters to those whose `nextRunAt <= now`
3. For each: fetches analytics data → generates HTML report → sends via SendGrid → updates `lastRunAt` and `nextRunAt`

**Rationale:** Single entry point is easier to maintain and monitor. The existing analytics endpoints (`/api/analytics/*`) can be called internally using `app.request()` pattern or by directly calling the AppController methods.

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| **PDF generation on Cloudflare Workers may not work** with `@react-pdf/renderer` in `nodejs_compat` mode | Scheduled reports can't include PDF attachments | Fall back to rich HTML email. PDF download available client-side in UI. |
| **Migration of existing `publicNotes` to `replies[]`** could lose data if migration script has bugs | Customer loses visibility into past agent responses | Dry-run migration on staging data. Keep `publicNotes` field intact post-migration as fallback. |
| **KV eventual consistency** (10s read-after write) for knowledge base articles | Admin publishes article, customer can't see it immediately | Acceptable for KB. Add 5s client-side cache busting. |
| **AI auto-categorization accuracy** may be low initially | Wrong categories assigned to tickets | Always mark as "suggested" — agent can override. Track accuracy over time. |
| **Sentiment analysis adds latency** to every customer message | Slower reply processing | Run sentiment asynchronously (fire-and-forget). Don't block the message pipeline. |
| **Cron trigger costs** — each cron invocation is a Worker invocation | Increased Cloudflare bill | 4 cron jobs × reasonable frequency = minimal cost. Monitor via observability. |
| **Conversation thread replaces simple `publicNotes`** — existing customer UI only shows one note | Customer UI must be rewritten to show thread | Part of the scope (QW-1). Existing single-note display is a subset of thread display. |
| **Knowledge base search is keyword-only** (no vector search) | Poor search relevance for large article sets | Acceptable for <500 articles. Upgrade to vector search in Phase 3 if needed. |

## Migration Plan

### Deployment Steps
1. **KV Namespace Setup**: Create `KNOWLEDGE_BASE_KV` KV namespace via `wrangler kv namespace create`
2. **wrangler.jsonc Update**: Add KV binding, cron triggers, update DO migrations if needed
3. **Backend Deploy First**: Deploy worker changes (new types, routes, cron handler)
4. **Data Migration Run**: Run one-time migration script to convert `publicNotes` → `replies[]`
5. **Frontend Deploy**: Deploy React changes (thread UI, KB pages, settings, AI panels)
6. **Cron Activation**: Enable cron triggers (they activate on deploy)
7. **Verification**: Test customer reply flow, KB search, cron execution, PDF download

### Rollback Strategy
- **Backend rollback**: Revert to previous worker version. The `publicNotes` field is preserved, so rollback won't break existing ticket views.
- **Frontend rollback**: Revert to previous build. Old UI reads `publicNotes` which still exists.
- **Data rollback**: No destructive migrations — `publicNotes` is never deleted, only copied to `replies[]`.
- **KV cleanup**: If KB articles need removal, delete `kb:*` keys.

## Open Questions

1. **Should the knowledge base support multiple languages?** Current scope assumes single language (English/Indonesian based on system locale). Multi-language would require article versioning.
   - *Decision pending* — assume single language for now.

2. **Should AI suggested responses be inserted directly into the reply box, or shown as a separate panel the agent must explicitly accept?**
   - *Decision pending* — lean toward "shown as suggestion panel, agent copies or clicks 'Use'" to maintain agent control.

3. **Should sentiment scores trigger automatic priority escalation, or just flag/warn the agent?**
   - *Decision pending* — Phase 2: flag/warn only. Auto-escalation via sentiment reserved for Phase 3 (workflow automation builder).

4. **PDF report generation on Workers — has `@react-pdf/renderer` been tested with `nodejs_compat`?**
   - *Needs investigation* — if it doesn't work, HTML-only for scheduled reports.

5. **Should the daily digest for customer notifications batch all updates into one email, or send a summary with links?**
   - *Decision pending* — summary with links is more actionable. Implementation detail for notification prefs.
