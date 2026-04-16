## Why

VoxCare saat ini hanya mendukung web portal, email, dan AI chat sebagai channel komunikasi customer. Di Indonesia, WhatsApp adalah channel komunikasi dominan — customer lebih nyaman WA daripada email atau web form. Tanpa WhatsApp, VoxCare bukan "call center" yang sesungguhnya, melainkan "ticket center" yang terbatas pada digital-native users saja.

Integrasi WhatsApp via WAHA (self-hosted) memberikan customer channel yang familiar tanpa biaya per-message dari Meta Cloud API, dengan tetap satu inbox yang terintegrasi dengan ticketing system.

## What Changes

- Deploy WAHA (WhatsApp HTTP API) server di VPS via Docker
- Add WhatsApp webhook endpoint di VoxCare Worker untuk menerima incoming messages
- Implement WhatsApp message → ticket creation & routing logic
- Add WhatsApp reply endpoint di agent UI (agent reply dari VoxCare → dikirim via WAHA API)
- Store WhatsApp messages dalam ticket conversation thread (unified with email/chat)
- Add WhatsApp session management (QR scan, connection status, reconnect logic)
- Add customer phone number matching to existing customer profiles

## Capabilities

### New Capabilities
- `whatsapp-channel`: WhatsApp integration via WAHA self-hosted server, including webhook receiver, message-to-ticket routing, agent reply via WAHA API, session management, and unified conversation thread.
- `waha-server`: WAHA server deployment and management, including Docker deployment, QR code scanning, session monitoring, and auto-reconnect.

### Modified Capabilities
- `customer-ticket-replies`: Existing reply system extended to support WhatsApp as another message source (same thread model).

## Impact

- **External**: WAHA server on separate VPS (Ubuntu, Docker). Requires 1 WhatsApp number.
- **Worker**: New routes `/api/whatsapp/webhook` (incoming), `/api/whatsapp/send` (outgoing via WAHA API proxy).
- **AppController DO**: New methods for WhatsApp session state, customer phone matching.
- **Frontend**: Agent reply UI extended with WhatsApp indicator. WAHA connection status in admin settings.
- **wrangler.jsonc**: New env vars for WAHA URL and API key.
- **Customer**: Customers can interact via WhatsApp. Messages appear in ticket thread alongside email/chat replies.
