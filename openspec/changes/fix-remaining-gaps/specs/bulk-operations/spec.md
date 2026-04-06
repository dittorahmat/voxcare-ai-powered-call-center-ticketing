## MODIFIED Requirements

### Requirement: Bulk Assign Button Visibility
The BulkActionBar component SHALL display the "Assign" button when the `agents` prop contains one or more agents. The Tickets page SHALL fetch agents from `GET /api/agents` on mount and pass them to the BulkActionBar.

#### Scenario: Agents available, assign button shown
- **WHEN** agents are fetched and at least one agent exists
- **THEN** the "Assign" button appears in the bulk action bar

#### Scenario: No agents, assign button hidden
- **WHEN** no agents are available
- **THEN** the "Assign" button is not shown
