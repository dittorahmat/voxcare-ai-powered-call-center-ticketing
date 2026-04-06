## ADDED Requirements

### Requirement: SSE Notification Stream
The system SHALL expose a Server-Sent Events endpoint (`GET /api/notifications/stream`) that maintains a long-lived HTTP connection and pushes JSON-formatted notification events to subscribed clients. The connection SHALL support automatic reconnection via the SSE `retry` directive.

#### Scenario: Client subscribes to notification stream
- **WHEN** an authenticated client opens a GET request to `/api/notifications/stream`
- **THEN** the system establishes an SSE connection and begins pushing events

#### Scenario: SSE connection drops and reconnects
- **WHEN** the SSE connection is interrupted
- **THEN** the client automatically reconnects and receives any missed events using the Last-Event-ID header

### Requirement: Notification Event Types
The system SHALL push the following event types over the SSE stream: `ticket-created`, `ticket-updated`, `sla-warning`, `sla-breached`, `call-assigned`, `call-incoming`, `agent-status`, `escalation`, `system-alert`. Each event SHALL include a typed payload with `eventId`, `timestamp`, `type`, and `data` fields.

#### Scenario: New ticket created via voice intake
- **WHEN** a new ticket is created from a voice call
- **THEN** all connected supervisors and admins receive a `ticket-created` event with ticket details

#### Scenario: SLA warning threshold reached
- **WHEN** a ticket's SLA response deadline is within 10 minutes
- **THEN** the assigned agent and their supervisor receive an `sla-warning` event

#### Scenario: SLA breach occurs
- **WHEN** a ticket exceeds its SLA resolution deadline without being resolved
- **THEN** the system pushes an `sla-breached` event to all supervisors

### Requirement: Notification Persistence and Inbox
The system SHALL persist all notifications in the Durable Object store. Each notification SHALL have: `id`, `type`, `recipientId`, `read` status, `createdAt`, `expiresAt`, and `data` payload. Users SHALL be able to query their notification inbox via `GET /api/notifications` and mark notifications as read via `PATCH /api/notifications/:id/read`.

#### Scenario: User queries their notification inbox
- **WHEN** an authenticated user requests their notifications
- **THEN** the system returns unread notifications sorted by creation date (newest first)

#### Scenario: User marks notification as read
- **WHEN** a user marks a specific notification as read
- **THEN** the notification's `read` status is updated and it is excluded from the unread count

### Requirement: Notification Preferences
The system SHALL respect user-level notification preferences for controlling which event types are delivered. Users SHALL be able to enable/disable: sound alerts, desktop notifications, and email notifications. Preferences SHALL be stored in the settings store and checked before pushing events.

#### Scenario: User disables sound alerts
- **WHEN** a user sets `soundEnabled: false` in their notification preferences
- **THEN** the frontend client does not play sound for incoming notification events

### Requirement: Unread Count Badge
The system SHALL expose `GET /api/notifications/unread-count` that returns the count of unread notifications for the authenticated user. The frontend SHALL display this count as a badge on the notification bell in the sidebar.

#### Scenario: User has unread notifications
- **WHEN** a user has 5 unread notifications
- **THEN** the notification bell displays a badge with the number 5

#### Scenario: User has no unread notifications
- **WHEN** a user has read all notifications
- **THEN** the notification bell displays no badge or shows a neutral indicator
