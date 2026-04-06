## Context

VoxCare is a Cloudflare Workers + React call center application. The previous `harden-call-center-core` change added auth, SLA, analytics, settings, and agent routing — but left several gaps:
- Functional bugs: dummy notification bell, hardcoded "Jane Doe" avatar, non-functional header search, missing `byCategory` in analytics
- Missing features: customer management, real-time SSE notifications, user management UI, pagination, call history, audit log, bulk operations, global search
- Code quality: `authFetch` duplicated across 8+ files

Current architecture: Hono backend on Cloudflare Workers with Durable Objects (AppController, AuthController, ChatAgent) for persistence. React frontend with Zustand, shadcn/ui, Recharts.

## Goals / Non-Goals

**Goals:**
- Fix all identified UI bugs (bell, avatar, search, analytics)
- Add customer management with full CRUD and ticket linking
- Complete real-time notifications with SSE stream + dropdown panel
- Add user management UI for admin role
- Add pagination to all list endpoints with frontend controls
- Add call history page linked to tickets
- Add audit/activity log for tracking changes
- Add bulk ticket operations
- Add global search with Cmd+K command palette
- Centralize API client to eliminate authFetch duplication

**Non-Goals:**
- Actual FreeSWITCH telephony integration (separate phase)
- Multi-tenant/organization support
- External email provider integration (SendGrid, etc.)
- File attachment support on tickets
- AI-powered customer suggestions

## Decisions

### 1. Pagination: Cursor-Based vs Offset-Based

**Decision:** Use offset-based pagination (`page`, `limit`) for all list endpoints.

**Rationale:**
- Offset-based is simpler to implement with Durable Object Map-based storage
- Call center scale (<50K records) doesn't require cursor-based performance
- Frontend pagination controls naturally map to page numbers
- Alternative: cursor-based — better for large datasets but overkill here

**API Response Format:**
```json
{
  "success": true,
  "data": [...],
  "pagination": { "total": 150, "page": 1, "limit": 20, "totalPages": 8 }
}
```

### 2. Customer-Ticket Relationship

**Decision:** Tickets reference customers by `customerId` (optional). `customerName` string field remains for backward compatibility. New tickets should use `customerId`.

**Rationale:**
- Non-breaking: existing tickets without `customerId` continue to work
- Gradual migration: can link existing customers over time
- Customer lookup is O(n) on DO Map — acceptable for <10K customers
- Alternative: require `customerId` on all tickets — breaking change, forces migration

### 3. SSE Implementation: Long-Lived Stream with Heartbeat

**Decision:** Single SSE endpoint (`GET /api/notifications/stream`) with heartbeat every 30 seconds. Each event has an ID for reconnection support.

**Rationale:**
- Workers support streaming responses natively
- Heartbeat prevents Cloudflare's idle timeout
- Last-Event-ID header enables missed event recovery
- Alternative: WebSocket — more complex, unnecessary for one-directional push
- Alternative: short-polling — wasteful, poor UX

### 4. Centralized API Client

**Decision:** Create `src/lib/apiClient.ts` with `apiGet()`, `apiPost()`, `apiPatch()`, `apiPut()`, `apiDelete()` functions. All include auth headers automatically. Replace all 8+ `authFetch` copies.

**Rationale:**
- Single source of truth for API calls
- Easy to add interceptors (logging, error handling, retry logic)
- No new dependencies needed
- Alternative: Axios — adds dependency, overkill for simple fetch wrapper
- Alternative: TanStack Query — good for data fetching but doesn't replace mutations

### 5. Global Search: Dedicated Endpoint vs Client-Side Filtering

**Decision:** Dedicated `GET /api/search?q=&type=ticket,customer,call&limit=10` endpoint that searches across all entities.

**Rationale:**
- Server-side search is more efficient than fetching all data client-side
- Supports relevance ranking
- Can scale to larger datasets
- Alternative: client-side filter — only works if all data is loaded, breaks at scale

### 6. Command Palette: shadcn Command Component

**Decision:** Use shadcn's built-in `Command` component (already installed but unused) for Cmd+K command palette.

**Rationale:**
- Already in project dependencies
- Integrates with existing shadcn theme system
- Supports search, keyboard navigation, grouped results
- Alternative: custom modal — reinvents the wheel

### 7. Audit Log: Append-Only DO Map

**Decision:** Store audit entries in a Map on AppController with auto-cleanup (keep last 10K entries). Each entry: `{ id, action, userId, entityType, entityId, timestamp, metadata }`.

**Rationale:**
- DO storage is persistent (SQLite-backed)
- Append-only ensures data integrity
- 10K cap prevents storage bloat
- Alternative: separate DO — unnecessary complexity
- Alternative: external logging service — adds cost and dependency

### 8. Bulk Operations: Array-Based PATCH

**Decision:** Single `PATCH /api/tickets/bulk` endpoint accepting `{ ids: string[], updates: Partial<Ticket> }`.

**Rationale:**
- Simple, single request
- Atomic-ish (best effort within DO)
- Alternative: batch endpoint — more complex, not needed for DO architecture

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Pagination changes all list endpoints | **Breaking** — existing clients expect flat array response | Document migration; keep old format as `?format=flat` fallback temporarily |
| DO Map grows large (customers, audit log) | Storage limits, slower iteration | Implement size caps; periodic cleanup on startup |
| SSE connections consume Worker resources | Connection limits under high load | Limit concurrent SSE connections per user; implement heartbeat timeout |
| Customer linking breaks existing tickets | Data inconsistency | `customerId` is optional; `customerName` preserved for backward compat |
| Global search relevance ranking is naive | Poor search UX | Start with simple text matching; can improve with TF-IDF later |
| Bulk operations are not fully atomic | Partial failures possible | Return per-item success/failure in response; log failures |
| Command palette loads all results client-side | Slow initial load | Server-side search API with debounced input |
| Audit log auto-cleanup at 10K may lose data | Compliance concern | Make limit configurable; export audit log before cleanup |
