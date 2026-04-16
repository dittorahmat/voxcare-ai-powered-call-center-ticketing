## ADDED Requirements

### Requirement: Incoming WhatsApp messages create or update tickets
The system SHALL receive incoming WhatsApp messages via a webhook endpoint. If the sender's phone number matches an existing customer, the message SHALL be added as a reply to their latest open/reopened ticket. If no matching customer exists, a new customer record and ticket SHALL be auto-created.

#### Scenario: Returning customer sends WhatsApp message
- **WHEN** customer with phone number +628123456789 sends "Saya masih punya masalah internet" to the VoxCare WhatsApp number
- **THEN** the system finds the existing customer, adds the message as a reply to their latest open ticket, and updates the ticket's `updatedAt` timestamp

#### Scenario: New customer sends WhatsApp message
- **WHEN** unknown phone number sends "Halo, saya butuh bantuan" to the VoxCare WhatsApp number
- **THEN** the system creates a new customer record with the phone number, creates a new ticket with the message as description, and sends a welcome reply via WhatsApp

### Requirement: Agent replies are sent via WhatsApp
When an agent replies to a ticket that has a WhatsApp conversation, the reply SHALL be sent to the customer via WhatsApp using the WAHA API.

#### Scenario: Agent replies to WhatsApp ticket
- **WHEN** agent sends a reply to a ticket that originated from WhatsApp
- **THEN** the reply text is sent to the customer's WhatsApp number via WAHA's `/api/sendText` endpoint

#### Scenario: Customer has both email and WhatsApp history
- **WHEN** customer has interacted via both email and WhatsApp on the same ticket
- **THEN** agent replies are sent to the customer's preferred channel (last channel used by customer)

### Requirement: WhatsApp messages stored in unified thread
All WhatsApp messages (incoming and outgoing) SHALL be stored in the ticket's `replies[]` array with `sender` type `'customer'` for incoming and `'agent'` for outgoing.

#### Scenario: Thread shows WhatsApp messages
- **WHEN** agent views ticket thread in the UI
- **THEN** WhatsApp messages appear alongside email and chat messages, with a WhatsApp indicator showing the channel

### Requirement: Customer phone number matching
The system SHALL match incoming WhatsApp phone numbers to existing customer profiles by phone number. If a match is found, the customer record is used. If not found, a new customer is created.

#### Scenario: Phone number with country code
- **WHEN** incoming message from "+62 812-3456-7890" and customer has phone "+6281234567890"
- **THEN** the system matches the customer (normalizes phone format)

### Requirement: WhatsApp session management
The system SHALL expose an admin endpoint to check WAHA connection status, display QR code for initial setup, and trigger session reconnection.

#### Scenario: Admin checks WAHA status
- **WHEN** admin visits WhatsApp settings page
- **THEN** the system shows WAHA connection status (connected/disconnected), session phone number, and last activity time

#### Scenario: Session disconnected
- **WHEN** WAHA session disconnects (QR expired)
- **THEN** the admin page shows the QR code for re-scanning and sends an alert notification to supervisors
