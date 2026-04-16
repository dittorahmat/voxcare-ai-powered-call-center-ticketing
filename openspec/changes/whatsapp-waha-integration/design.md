## Context

VoxCare runs on Cloudflare Workers with Durable Objects for state. WAHA (WhatsApp HTTP API) is a self-hosted WhatsApp gateway built on whatsapp-web.js that runs on a separate VPS via Docker. VoxCare already has a unified conversation thread model (`Ticket.replies[]`) that supports customer and agent messages — WhatsApp messages will simply be another sender type in the same thread.

Current infrastructure:
- Cloudflare Workers (VoxCare backend)
- AppController DO (ticket state, user state)
- R2 (file attachments)
- KV (knowledge base)

**New infrastructure needed:**
- VPS for WAHA (can share with future FreeSWITCH)
- Docker Compose running WAHA container

## Goals / Non-Goals

**Goals:**
- Customers can message VoxCare via WhatsApp
- Incoming WA messages create or update tickets automatically
- Agents reply from VoxCare UI → reply sent via WhatsApp
- Unified conversation thread (email, chat, WA all in one place)
- Customer phone number matched to existing customer profiles
- WAHA session management (QR scan, status monitoring, auto-reconnect)

**Non-Goals:**
- Multiple WhatsApp numbers (one number for the queue)
- WAHA management UI (basic status + reconnect is enough)
- Message templates / broadcast (Phase 3)
- WA media handling beyond text (images, documents — Phase 2)
- Read receipts / typing indicators

## Decisions

### D1: WAHA vs Meta Cloud API
**Decision:** Use WAHA (self-hosted via whatsapp-web.js) instead of Meta Cloud API.

**Rationale:**
- No per-message cost (saves significant cost for high-volume call center)
- Full data control (messages stay on our infrastructure)
- No Meta business verification requirements
- Can run on same VPS as future FreeSWITCH

**Risks mitigated:**
- Session disconnect risk: auto-reconnect + alerting
- Ban risk: use dedicated number (not personal number), avoid spam patterns
- Uptime risk: monitor WAHA health, alert on disconnect

### D2: Single Queue Number vs Per-Agent Numbers
**Decision:** Single WhatsApp number for the entire queue. VoxCare routes to available agents.

**Rationale:**
- Customer doesn't need to know agent phone numbers
- Load balancing across agents
- Simpler management (1 number, 1 session)
- Agent on/off doesn't affect availability
- Matches call center industry standard (single inbound number → ACD routing)

### D3: Message → Ticket Mapping
**Decision:** Match customer phone number to existing customer profile. If found, add to their latest open ticket. If not found, create new ticket with auto-created customer record.

**Rationale:**
- Seamless experience for returning customers
- Automatic ticket creation for new customers
- Consistent with existing email-to-ticket logic

### D4: WAHA API Access from Cloudflare Workers
**Decision:** VoxCare Worker calls WAHA REST API directly via HTTPS. WAHA webhook sends incoming messages to VoxCare Worker endpoint.

**Architecture:**
```
Customer WA → WAHA Server → Webhook → VoxCare Worker (creates/updates ticket)
VoxCare Worker → WAHA API (POST /api/sendText) → Customer WA
```

No message queue needed — direct HTTP calls are sufficient for expected volume.

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| WAHA session disconnect (QR expired) | Customers can't send WA messages | Monitor endpoint, alert admin, quick QR re-scan |
| WhatsApp number banned | Complete WA channel outage | Use dedicated number, follow WA ToS, avoid bulk messaging |
| WAHA server downtime | Messages lost | Health check every 5 min, auto-restart via Docker, alert on failure |
| Message delivery delays | Customer experience degradation | Direct HTTP calls (no queue), timeout handling, retry logic |
| Media messages not handled | Customers sending images get no response | Log warning, reply with "text only" message, handle in Phase 2 |
