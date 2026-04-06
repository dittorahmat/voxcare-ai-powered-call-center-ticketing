## MODIFIED Requirements

### Requirement: Ticket Creation
The ticket creation process SHALL be extended to include: `assignedTo` (agent ID, auto-assigned via routing algorithm or null), `slaRecordId` (reference to the auto-created SLA record), and `customerId` (future: linked customer record). When a ticket is created via voice intake, the system SHALL trigger the agent routing algorithm to assign an available agent.

#### Scenario: Voice intake ticket with auto-assignment
- **WHEN** a ticket is created from a completed voice call
- **THEN** the agent routing algorithm assigns the next available agent and the ticket includes the `assignedTo` field

#### Scenario: Manual ticket without assignment
- **WHEN** an agent creates a manual ticket via the dialog form
- **THEN** the ticket is created without auto-assignment and appears in the unassigned queue

### Requirement: Ticket Data Model
The Ticket type SHALL be extended with the following fields:
- `assignedTo: string | null` — ID of the assigned agent
- `slaRecordId: string | null` — ID of the associated SLA record
- `escalationLevel: number` — current escalation level (default 0)
- `resolutionTime: number | null` — minutes from creation to resolution
- `resolvedAt: string | null` — ISO timestamp when ticket was resolved
- `resolvedBy: string | null` — ID of the agent who resolved the ticket
- `customerId: string | null` — linked customer identifier (future use)

#### Scenario: Existing ticket without new fields
- **WHEN** a ticket created before this change is read
- **THEN** missing fields default to null/0 and the ticket remains accessible

### Requirement: Ticket Resolution
When a ticket is marked as resolved, the system SHALL: set `status` to `resolved`, set `resolvedAt` to the current timestamp, set `resolvedBy` to the resolving agent's ID, compute `resolutionTime` as the difference between `createdAt` and `resolvedAt` in minutes, and update the associated SLA record with `resolvedAt`.

#### Scenario: Agent resolves a ticket within SLA
- **WHEN** an agent marks a high-priority ticket as resolved 2 hours after creation (within 4-hour SLA)
- **THEN** the ticket status becomes `resolved`, resolutionTime is 120, and the SLA record is not breached

#### Scenario: Agent resolves an already-breached ticket
- **WHEN** an agent resolves a ticket whose SLA deadline has already passed
- **THEN** the ticket is resolved but the SLA record remains marked as breached

### Requirement: Ticket Update via Patch
The PATCH `/api/tickets/:id` endpoint SHALL be extended to accept updates for `assignedTo`, `status`, and `priority` fields. Changing `assignedTo` SHALL trigger the agent routing system to update availability. Changing `priority` SHALL recalculate SLA deadlines based on the new priority's SLA rule.

#### Scenario: Changing ticket priority recalculates SLA
- **WHEN** a supervisor changes a ticket's priority from `medium` to `urgent`
- **THEN** the SLA deadlines are recalculated using the urgent SLA rule from the ticket's original creation time

### Requirement: Ticket List Filtering
The `GET /api/tickets` endpoint SHALL support query parameters for filtering: `?status=open|in-progress|resolved`, `?priority=low|medium|high|urgent`, `?assignedTo=<agentId>`, `?category=<category>`, `?createdAfter=<ISODate>`, `?createdBefore=<ISODate>`. Filters SHALL be composable (multiple params = AND logic).

#### Scenario: Filtering tickets by status and priority
- **WHEN** a client requests `GET /api/tickets?status=open&priority=urgent`
- **THEN** only open urgent tickets are returned

#### Scenario: Filtering by assigned agent
- **WHEN** a client requests `GET /api/tickets?assignedTo=<agentId>`
- **THEN** only tickets assigned to that agent are returned
