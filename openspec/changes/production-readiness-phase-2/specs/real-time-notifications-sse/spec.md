## ADDED Requirements

### Requirement: SSE Stream Endpoint
The system SHALL expose a Server-Sent Events endpoint (`GET /api/notifications/stream`) that maintains a long-lived HTTP connection and pushes JSON-formatted notification events to authenticated subscribers. The connection SHALL send a heartbeat comment every 30 seconds to prevent idle timeout.

#### Scenario: Client subscribes to SSE stream
- **WHEN** an authenticated client opens `GET /api/notifications/stream` with Authorization header
- **THEN** the system establishes an SSE connection and begins pushing events

#### Scenario: Heartbeat keeps connection alive
- **WHEN** no events are sent for 30 seconds
- **THEN** the server sends a heartbeat comment (`: heartbeat\n\n`)

### Requirement: Notification Push Integration
The system SHALL push notification events to SSE subscribers when: a new ticket is created, an SLA threshold is breached or warned, a ticket is escalated, a call is assigned to an agent, or an agent's status changes. Events SHALL include `eventId`, `type`, `timestamp`, and typed `data`.

#### Scenario: Ticket creation pushes notification
- **WHEN** a new ticket is created
- **THEN** all subscribed users receive a `ticket-created` event

#### Scenario: SLA breach pushes notification
- **WHEN** a ticket's SLA deadline passes without resolution
- **THEN** subscribed supervisors receive an `sla-breached` event

### Requirement: SSE Client Hook
The frontend SHALL provide a `useNotificationStream()` hook that: connects to the SSE endpoint, auto-reconnects on disconnection with exponential backoff, dispatches typed events to handlers, and exposes `isConnected` and `lastEvent` state.

#### Scenario: SSE connection drops
- **WHEN** the SSE connection is interrupted
- **THEN** the hook auto-reconnects after 1s, then 2s, then 4s (max 30s)

#### Scenario: Event is dispatched
- **WHEN** a `ticket-created` event is received
- **THEN** the hook updates the notification store and triggers a sound/desktop alert if enabled

### Requirement: Notification Dropdown Panel
The bell icon in the header SHALL display the unread count from `/api/notifications/unread-count`. Clicking the bell SHALL open a dropdown panel showing the 10 most recent notifications with type icons, timestamps, and read/unread status. Clicking a notification SHALL mark it as read and navigate to the relevant resource.

#### Scenario: Bell shows unread count
- **WHEN** a user has 3 unread notifications
- **THEN** the bell displays a badge with "3"

#### Scenario: Opening notification dropdown
- **WHEN** a user clicks the bell icon
- **THEN** a dropdown panel shows the 10 most recent notifications

#### Scenario: Clicking a notification
- **WHEN** a user clicks a `ticket-created` notification
- **THEN** the notification is marked read and the user is navigated to the ticket detail page
