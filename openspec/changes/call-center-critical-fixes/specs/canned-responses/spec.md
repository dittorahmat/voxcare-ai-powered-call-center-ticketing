## ADDED Requirements

### Requirement: Canned Responses Management
Admin users SHALL create, edit, and delete canned response templates via a Settings page. Each template SHALL have: `id`, `name`, `body` (text with variables), `category`, `createdAt`, `updatedAt`. Supported variables: `{{customer_name}}`, `{{ticket_id}}`, `{{agent_name}}`. Templates SHALL be organized by category.

#### Scenario: Admin creates a canned response
- **WHEN** an admin creates a template with body "Hello {{customer_name}}, your ticket {{ticket_id}} has been received"
- **THEN** the template is saved and available to all agents

### Requirement: Insert Canned Response into Notes
Agents SHALL select a canned response from a dropdown while composing internal or public notes. The selected template SHALL have variables substituted with current ticket context before insertion.

#### Scenario: Agent inserts canned response
- **WHEN** an agent selects the "Greeting" template while composing a note
- **THEN** the template text is inserted with `{{customer_name}}` replaced by the actual customer name
