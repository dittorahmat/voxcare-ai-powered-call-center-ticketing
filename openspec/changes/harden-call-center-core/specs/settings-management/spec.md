## ADDED Requirements

### Requirement: User Profile Settings Page
The system SHALL provide a settings page (`/settings/profile`) where authenticated users can update their display name, email (admin-only), password, and notification preferences. Changes SHALL be validated server-side and persisted to the user store.

#### Scenario: User updates their display name
- **WHEN** a user changes their display name and saves
- **THEN** the new name is persisted and displayed across the application

#### Scenario: User changes their password
- **WHEN** a user submits their current password and a new password
- **THEN** the password is updated and all existing sessions are invalidated

### Requirement: System Configuration Page
The system SHALL provide an admin-only settings page (`/settings/system`) for managing: company name, timezone, working hours, ticket categories (add/remove/reorder), and ticket priority levels. All changes SHALL be validated and persisted to the settings store.

#### Scenario: Admin adds a new ticket category
- **WHEN** an admin adds "Billing" to the ticket categories list
- **THEN** "Billing" appears as an option in the ticket creation form across the application

#### Scenario: Non-admin accessing system settings
- **WHEN** a user with role `agent` navigates to `/settings/system`
- **THEN** the user is redirected to the dashboard with an "Access Denied" notification

### Requirement: SLA Rules Configuration Page
The system SHALL provide an admin-only settings page (`/settings/sla`) for configuring SLA rules per priority level. Each rule SHALL have editable fields for response time, resolution time, and escalation time. Changes SHALL take effect immediately for new tickets; existing tickets SHALL retain their original deadlines.

#### Scenario: Admin modifies urgent SLA response time
- **WHEN** an admin changes the urgent response time from 15 to 10 minutes
- **THEN** new urgent tickets receive a 10-minute response deadline; existing urgent tickets keep their original deadline

### Requirement: AI Model Configuration Page
The system SHALL provide a settings page (`/settings/ai`) for configuring AI parameters: default model selection, temperature, max tokens, system prompt template, and tool enablement (weather, web search, MCP). Configuration SHALL be validated and persisted; changes SHALL apply to new AI interactions without server restart.

#### Scenario: Admin changes default AI model
- **WHEN** an admin switches the default model from Gemini 2.5 Flash to Gemini 2.5 Pro
- **THEN** subsequent AI interactions use the new model

#### Scenario: Admin updates system prompt template
- **WHEN** an admin modifies the ticket extraction prompt template
- **THEN** the next voice intake uses the updated prompt for AI analysis

### Requirement: Notification Preferences Page
The system SHALL provide a settings page (`/settings/notifications`) where users can configure: sound alerts (on/off with volume), desktop notifications (browser permission request), and per-event-type toggles (ticket created, SLA warning, SLA breach, escalation, call assigned).

#### Scenario: User enables desktop notifications
- **WHEN** a user toggles on desktop notifications
- **THEN** the browser requests notification permission and, if granted, desktop notifications are sent for matching events

### Requirement: Settings API
The system SHALL expose REST endpoints for settings management:
- `GET /api/settings` — returns all settings (role-filtered: agents see only their profile)
- `PUT /api/settings/system` — updates system settings (admin only)
- `PUT /api/settings/sla` — updates SLA rules (admin only)
- `PUT /api/settings/ai` — updates AI configuration (admin only)
- `PUT /api/settings/profile` — updates user profile (self only)
- `PUT /api/settings/notifications` — updates notification preferences (self only)

#### Scenario: Agent retrieves their settings
- **WHEN** an agent calls `GET /api/settings`
- **THEN** the response includes only their profile and notification preferences — system and SLA settings are excluded

#### Scenario: Admin updates system settings
- **WHEN** an admin sends `PUT /api/settings/system` with valid configuration
- **THEN** the settings are persisted and subsequent reads return the updated values
