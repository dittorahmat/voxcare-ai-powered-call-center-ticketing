## ADDED Requirements

### Requirement: WAHA server deployed via Docker
The WAHA (WhatsApp HTTP API) server SHALL be deployed on a VPS using Docker Compose, with persistent session storage to survive container restarts.

#### Scenario: Initial WAHA setup
- **WHEN** admin deploys WAHA via Docker Compose
- **THEN** the WAHA container starts, displays a QR code, and waits for WhatsApp scan

#### Scenario: Session persists across restarts
- **WHEN** WAHA container restarts
- **THEN** the WhatsApp session is restored without requiring QR re-scan

### Requirement: WAHA health monitoring
The system SHALL check WAHA health every 5 minutes and alert supervisors if the session is disconnected or the API is unreachable.

#### Scenario: WAHA health check passes
- **WHEN** WAHA health endpoint returns 200 OK
- **THEN** the system logs the status as healthy

#### Scenario: WAHA health check fails
- **WHEN** WAHA health endpoint is unreachable or returns error
- **THEN** the system creates a notification for supervisors and marks the WhatsApp channel as offline

### Requirement: WAHA API key authentication
All WAHA API endpoints SHALL be protected with an API key configured in the WAHA container environment.

#### Scenario: Request without API key
- **WHEN** VoxCare Worker calls WAHA API without the correct API key
- **THEN** WAHA returns 401 Unauthorized

### Requirement: WAHA webhook delivers messages to VoxCare
WAHA SHALL be configured to send incoming WhatsApp messages to the VoxCare Worker webhook endpoint via HTTP POST.

#### Scenario: Incoming message delivered
- **WHEN** customer sends WhatsApp message
- **THEN** WAHA POSTs the message payload to `/api/whatsapp/webhook` on VoxCare Worker with the message body, sender phone number, and timestamp
