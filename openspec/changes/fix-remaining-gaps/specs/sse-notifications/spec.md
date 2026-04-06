## ADDED Requirements

### Requirement: Real-Time SSE Push Notifications
The system SHALL use the existing `useNotificationStream()` hook to establish a real-time SSE connection to `/api/notifications/stream`. When an event is received, the system SHALL update the unread count, play a sound alert if enabled, and trigger a desktop notification if permitted. The hook SHALL be connected in the MainLayout component so it runs on every authenticated page.

#### Scenario: SSE connection established on page load
- **WHEN** an authenticated user loads any page
- **THEN** the SSE connection is established and the `isConnected` state is true

#### Scenario: Real-time notification received
- **WHEN** a `ticket-created` event is received via SSE
- **THEN** the unread count increments and a sound alert plays if enabled

#### Scenario: SSE connection drops and reconnects
- **WHEN** the SSE connection is interrupted
- **THEN** the hook auto-reconnects with exponential backoff (1s, 2s, 4s, max 30s)
