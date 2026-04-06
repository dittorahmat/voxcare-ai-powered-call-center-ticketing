## ADDED Requirements

### Requirement: Configurable auto-close rules
Admins SHALL create, edit, and delete auto-close rules. Each rule defines a condition (ticket status, inactivity period) and an action (set status to closed, add internal note). Rules SHALL be evaluated daily via Cloudflare Cron Triggers.

#### Scenario: Create auto-close rule
- **WHEN** an admin creates a rule "Auto-close resolved tickets after 7 days of inactivity"
- **THEN** the rule is saved and evaluated daily against all matching tickets

#### Scenario: Rule evaluation closes eligible tickets
- **WHEN** the cron trigger evaluates rules at 00:00 UTC
- **THEN** all tickets matching the condition have their status set to `closed` and an internal note is added

#### Scenario: Disabled rule is skipped
- **WHEN** a rule is disabled by an admin
- **THEN** the rule is skipped during cron evaluation and no tickets are affected

### Requirement: Auto-close rule conditions
Rules SHALL support the following conditions: ticket status (open, resolved, etc.), days since last update, days since last customer reply. Multiple conditions SHALL be combined with AND logic.

#### Scenario: Rule with multiple conditions
- **WHEN** a rule requires "status is resolved AND no customer reply for 5 days"
- **THEN** only tickets meeting both conditions are auto-closed

### Requirement: Auto-close audit logging
Every auto-close action SHALL create an audit entry with the rule name, ticket ID, and timestamp. The internal note added to the ticket SHALL reference the auto-close rule by name.

#### Scenario: Auto-close creates audit entry
- **WHEN** a ticket is auto-closed by a rule
- **THEN** an audit entry is created documenting the rule name, ticket, and action taken
