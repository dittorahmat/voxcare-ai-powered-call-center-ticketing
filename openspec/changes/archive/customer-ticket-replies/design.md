## Context

VoxCare stores all operational data (tickets, users, customers, etc.) in a single AppController Durable Object with SQLite-backed storage. The `Ticket` interface currently has `publicNotes: PublicNote | null` — a single note from agent to customer, not a conversation thread. Customers have no reply capability. The AppController DO uses Map-based in-memory storage with `ctx.storage.put()` persistence.

Current ticket model: `Ticket` has `internalNotes: InternalNote[]` (array) but only `publicNotes: PublicNote | null` (single). This change adds `replies: TicketReply[]` as the unified conversation thread.

## Goals / Non-Goals

**Goals:**
- Enable two-way customer-agent conversations on tickets
- Provide chronological thread view for both customer and agent
- Support file attachments in customer replies
- Notify agents of customer replies (in-app + email)
- Migrate existing `publicNotes` to new format without data loss

**Non-Goals:**
- No real-time typing indicators in reply thread
- No markdown rendering in replies (plain text + HTML links only)
- No customer-side conversation search/filter
- No agent-side AI reply suggestions (separate change: ai-assist-suite)

## Decisions

### D1: Replies Array vs. Separate Storage
**Decision:** Store replies as `Ticket.replies: TicketReply[]` array within the existing Ticket object in AppController DO SQLite.

**Rationale:** Consistent with existing `internalNotes[]` and `attachments[]` patterns. Replies are tightly coupled to tickets — no need for separate storage. DO SQLite can handle moderate-size arrays per ticket.

**Alternatives considered:**
- *Separate DO or KV for replies*: Overkill. Adds complexity for data that's always accessed with its parent ticket.
- *External conversation service*: Unnecessary for current scale.

### D2: Replace publicNotes vs. Keep Alongside
**Decision:** Add `replies[]` array and keep `publicNotes` field intact for backward compatibility. Migration copies `publicNotes` content as first reply entry but does NOT delete the original field.

**Rationale:** Safe rollback path. Existing code reading `publicNotes` continues to work during transition period.

### D3: Unified Reply Model for Customers and Agents
**Decision:** Both customers and agents write to the same `replies[]` array, differentiated by `sender` field (`'customer'` | `'agent'` | `'system'`).

**Rationale:** Single chronological thread is simpler to render and query. Separate arrays would require merging on read.

### D4: Rate Limiting Strategy
**Decision:** 10 replies per minute per ticket for customer endpoint. Uses existing rate-limiter.ts infrastructure.

**Rationale:** Prevents abuse while allowing normal conversation pace. Per-ticket scope (not per-user) prevents ticket-specific flooding.

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Large reply arrays may slow DO storage operations | Tickets with 100+ replies could cause slow reads | Acceptable for Phase 2. Consider pagination if threads grow beyond 200 replies. |
| Migration script fails on edge cases | Lost `publicNotes` content | Dry-run on copy of data. Keep `publicNotes` intact post-migration. |
| File attachment uploads consume R2 quota | Storage costs increase | 10MB limit per file, existing R2 bucket. Monitor usage. |
