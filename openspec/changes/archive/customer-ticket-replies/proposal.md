## Why

Customers can currently only create and view tickets — they cannot reply to existing tickets. This makes VoxCare a one-way ticket submission system rather than a conversation platform. Agents communicate via `publicNotes` but customers have no way to respond, add follow-up information, or attach files to their tickets. This change enables two-way customer-agent conversations.

## What Changes

- Add `TicketReply` type and `replies: TicketReply[]` array to Ticket model (replaces single `publicNotes` field)
- Create customer reply endpoint (`POST /api/customer/tickets/:id/replies`) with file attachment support
- Create agent reply endpoint (`POST /api/tickets/:id/replies`) for unified conversation thread
- Build `ConversationThread` component for chronological display of customer + agent messages
- Create notification + email flow to agents on customer replies
- Migration script to convert existing `publicNotes` into first reply entry
- Rate limiting on customer reply endpoint (10/minute per ticket)

## Capabilities

### New Capabilities
- `customer-ticket-replies`: Two-way conversation thread model for tickets, including customer reply API, agent reply API, file attachments for customers, chronological thread display, agent notifications on customer replies, and backward-compatible migration from `publicNotes`.

### Modified Capabilities
<!-- No existing specs modified yet — this is the first change to apply -->

## Impact

- **worker/types.ts**: New `TicketReply` type, `Ticket.replies` array, migration of `publicNotes`
- **worker/app-controller.ts**: New `addTicketReply()`, `getTicketReplies()` methods
- **worker/userRoutes.ts**: 4 new endpoints (customer POST/GET replies, agent POST/GET replies), rate limiting
- **worker/email-service.ts**: New email notification to agents on customer reply
- **src/components/tickets/ConversationThread.tsx**: New component
- **src/pages/CustomerTicketDetailPage.tsx**: Thread UI + reply form + file upload
- **src/pages/TicketDetails.tsx**: Agent thread view + reply form
- **wrangler.jsonc**: New migration tag (v5) for DO schema changes
