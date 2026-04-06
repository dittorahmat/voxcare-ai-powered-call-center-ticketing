## ADDED Requirements

### Requirement: Merge tickets into primary ticket
Agents with supervisor or admin role SHALL merge two or more tickets into a single primary ticket. The primary ticket absorbs all internal notes, public notes, attachments, and transcript entries from source tickets. Source tickets SHALL have their status set to `merged` and a `mergedInto` pointer to the primary ticket.

#### Scenario: Supervisor merges duplicate tickets
- **WHEN** a supervisor selects two duplicate tickets and chooses "Merge" with one as primary
- **THEN** the primary ticket contains all notes and attachments from both tickets, and source tickets are marked as `merged`

#### Scenario: Merged ticket is read-only
- **WHEN** an agent opens a ticket with status `merged`
- **THEN** the ticket is displayed read-only with a prominent link to the primary ticket

#### Scenario: Merge preserves audit trail
- **WHEN** tickets are merged
- **THEN** an audit entry is created documenting which tickets were merged, by whom, and into which primary ticket

### Requirement: Merge dialog with conflict resolution
The system SHALL provide a merge dialog where the agent selects the primary ticket and sees a preview of what will be merged. If both tickets have internal notes or attachments with the same timestamp, the system SHALL preserve both with source attribution.

#### Scenario: Select primary and source tickets
- **WHEN** an agent opens the merge dialog from a ticket
- **THEN** they can select other tickets to merge into the current one, see a preview, and confirm

#### Scenario: Merge confirmation required
- **WHEN** an agent attempts to merge tickets
- **THEN** the system requires explicit confirmation showing the number of tickets to merge and the resulting primary ticket
