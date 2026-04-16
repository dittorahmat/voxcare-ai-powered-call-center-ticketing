## ADDED Requirements

### Requirement: Supervisor can rate tickets on quality criteria
The system SHALL allow supervisors and admins to rate individual tickets on 4 criteria (Accuracy, Tone, Resolution, Professionalism) each scored 1-5, plus an overall score.

#### Scenario: Supervisor scores a ticket
- **WHEN** supervisor opens ticket quality dialog and submits scores: Accuracy=4, Tone=5, Resolution=3, Professionalism=4, Overall=4
- **THEN** the scorecard is saved to the ticket with the supervisor's ID, timestamp, and scores

#### Scenario: Supervisor edits an existing scorecard
- **WHEN** supervisor edits a previously saved scorecard
- **THEN** the scorecard is updated and the change is logged in the audit trail

### Requirement: Quality scorecard stored per ticket
Each quality scorecard SHALL be stored in the ticket record with: supervisorId, accuracy (1-5), tone (1-5), resolution (1-5), professionalism (1-5), overall (1-5), comments (optional), timestamp.

#### Scenario: Scorecard retrieved with ticket
- **WHEN** ticket details are loaded
- **THEN** any existing quality scorecard is included in the response

### Requirement: Ticket sampling for quality review
Supervisors SHALL be able to filter tickets for quality review by: agent, date range, and sample type (All, Random 10%, Flagged).

#### Scenario: Flagged ticket sampling
- **WHEN** supervisor selects "Flagged" sample type
- **THEN** tickets with CSAT ≤ 2 or negative sentiment alert are returned

#### Scenario: Random sampling
- **WHEN** supervisor selects "Random 10%" for Agent A in last 30 days
- **THEN** a random 10% of Agent A's tickets from the last 30 days are returned
