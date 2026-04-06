## Why

VoxCare is currently a prototype-level application with functional ticket CRUD, AI chat, and browser-based voice recording — but it lacks the foundational systems required for a production call center. There is no authentication, no real telephony integration, no operational management layer, and no way to monitor performance. This change transforms VoxCare from a demo into a production-ready call center platform.

## What Changes

- **Authentication & Authorization** — Introduces JWT-based session authentication with role-based access control (agent, supervisor, admin). Replaces the hardcoded "Jane Doe" identity.
- **FreeSWITCH Telephony Integration** — Adds an abstract integration layer for FreeSWITCH PBX via ESL (Event Socket Library) event bridge. Supports inbound/outbound call routing, real-time call events, and audio streaming for AI transcription. The interface is abstract — actual FreeSWITCH deployment is out of scope.
- **Real-Time Notification System** — Introduces Server-Sent Events (SSE) from Workers to browser for live updates: new tickets, SLA breaches, call assignments, system alerts.
- **SLA Tracking & Escalation** — Adds configurable SLA rules per ticket priority (response time, resolution time targets), countdown timers, auto-escalation when thresholds are breached.
- **Agent Assignment & Queue Routing** — Introduces round-robin and skill-based ticket assignment, call queue management, agent availability status.
- **Settings & Configuration Pages** — Adds UI and API for user profile management, ticket category configuration, SLA rule management, AI model configuration, and system settings.
- **Analytics & Reporting Dashboard** — Replaces the basic stat cards with a full analytics dashboard: resolution time trends, ticket volume analytics, agent performance metrics, and CSV/PDF report export.

## Capabilities

### New Capabilities

- `user-auth`: JWT-based authentication, session management, and role-based authorization (agent, supervisor, admin)
- `telephony-integration`: FreeSWITCH ESL event bridge interface, call routing, audio streaming abstraction, call queue management
- `real-time-notifications`: Server-Sent Events (SSE) notification system with configurable event types and client subscription management
- `sla-management`: SLA rule configuration, per-ticket SLA tracking, countdown timers, auto-escalation engine
- `agent-routing`: Agent availability management, round-robin/skill-based ticket assignment, call queue operations
- `settings-management`: User profile settings, system configuration (ticket categories, priorities), AI model configuration, notification preferences
- `analytics-reporting`: Ticket volume analytics, resolution time metrics, agent performance tracking, report export (CSV/PDF)

### Modified Capabilities

- `ticket-management`: Extends existing ticket CRUD with SLA records, assigned agent, escalation history, and category management. Existing Ticket type gains new fields: `assignedTo`, `slaDeadline`, `escalationLevel`, `resolutionTime`.

## Impact

- **Frontend**: New pages (Login, Settings, Analytics), protected routes, auth-aware components, SSE subscription hooks, notification UI, new data tables and charts
- **Backend Worker**: New auth middleware, auth routes (login, logout, refresh, me), SSE endpoint, SLA evaluation cron, agent routing endpoints, settings endpoints, analytics endpoints
- **Durable Objects**: AppController gains User, SLARecord, Notification, AgentQueue data stores. New `AuthController` DO for session/token management
- **Data Model**: New types for User, SLAConfig, SLARecord, Notification, AgentQueueEntry
- **Dependencies**: New library for JWT handling (e.g., `@hono/jwt`), SSE client library
- **Breaking**: All existing endpoints that assume an authenticated user will require auth headers. The hardcoded "Jane Doe" identity is removed.
