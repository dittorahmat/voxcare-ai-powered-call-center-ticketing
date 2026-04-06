# customer-notification-preferences Specification

## Purpose
TBD - created by archiving change phase1-2-customer-ops-excellence. Update Purpose after archive.
## Requirements
### Requirement: Customers can configure notification preferences
The system SHALL allow authenticated customers to set per-event email notification preferences (ticket-created, ticket-updated, ticket-resolved, agent-reply) and frequency (instant, daily-digest).

#### Scenario: Customer enables all notifications
- **WHEN** customer PATCHs `/api/customer/notification-preferences` with `{ events: { "ticket-created": true, "ticket-updated": true, "ticket-resolved": true, "agent-reply": true }, frequency: "instant" }`
- **THEN** the customer's `notificationPrefs` are updated and all event types are enabled with instant delivery

#### Scenario: Customer sets daily digest
- **WHEN** customer sets `frequency: "daily-digest"`
- **THEN** notifications for enabled events are batched and sent once daily at the customer's configured digest time (default: 9am in their timezone)

#### Scenario: Customer disables all notifications
- **WHEN** customer PATCHs preferences with all events set to `false`
- **THEN** no email notifications are sent to the customer for any event

### Requirement: Notification preferences stored in Customer record
The system SHALL store customer notification preferences in the `Customer` model under a `notificationPrefs` field in the AppController DO SQLite storage.

#### Scenario: Preferences persisted across sessions
- **WHEN** customer sets notification preferences
- **THEN** the preferences persist across page reloads and are returned by `GET /api/customer/profile`

### Requirement: Email sending respects customer notification preferences
The email sending logic SHALL check the customer's `notificationPrefs` before sending event-based emails. If the event is disabled for the customer, the email SHALL NOT be sent.

#### Scenario: Customer disabled ticket-updated notifications
- **WHEN** an agent adds a public note to the customer's ticket AND customer's `notificationPrefs.events["ticket-updated"]` is false
- **THEN** no email is sent to the customer

#### Scenario: Customer has daily digest frequency
- **WHEN** a ticket is updated and the customer's frequency is `daily-digest`
- **THEN** the notification is queued in a daily digest bucket and sent at the scheduled digest time (not immediately)

### Requirement: Customer notification preferences endpoint
The system SHALL provide `GET /api/customer/notification-preferences` and `PATCH /api/customer/notification-preferences` endpoints for authenticated customers.

#### Scenario: Customer retrieves their preferences
- **WHEN** customer GETs `/api/customer/notification-preferences`
- **THEN** the system returns their current notification preferences

### Requirement: Default notification preferences
When a customer account is created, default notification preferences SHALL be: all events enabled, frequency set to `instant`.

#### Scenario: New customer gets default preferences
- **WHEN** a new customer registers
- **THEN** their `notificationPrefs` are initialized with all events enabled and frequency `instant`

### Requirement: Daily digest cron job
The cron handler SHALL process daily digest notifications by collecting all queued notifications per customer and sending a single summary email.

#### Scenario: Daily digest email sent
- **WHEN** the cron handler runs for daily digests (daily at 9am customer timezone)
- **THEN** for each customer with queued notifications and `frequency: "daily-digest"`, a single summary email is sent with all updates

