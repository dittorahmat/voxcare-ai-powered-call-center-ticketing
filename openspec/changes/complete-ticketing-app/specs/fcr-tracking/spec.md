## ADDED Requirements

### Requirement: First Contact Resolution tracking
The system SHALL automatically flag tickets as First Contact Resolution (FCR) when all of the following conditions are met: (1) ticket resolved within configurable time window from creation (default: 1 hour), (2) no follow-up notes added after resolution, (3) customer did not reply or reopen after resolution. The flag SHALL be stored as `fcrFlag: boolean` on the ticket.

#### Scenario: Ticket qualifies as FCR
- **WHEN** a ticket is created at 10:00 and resolved at 10:30 with no follow-ups or reopens
- **THEN** the ticket is flagged as FCR (`fcrFlag: true`)

#### Scenario: Ticket does not qualify for FCR
- **WHEN** a ticket is created at 10:00 and resolved at 14:00 (4 hours later)
- **THEN** the ticket is not flagged as FCR (`fcrFlag: false`)

#### Scenario: Reopened ticket loses FCR flag
- **WHEN** a ticket was flagged FCR but the customer replies after resolution
- **THEN** the FCR flag is removed

### Requirement: FCR rate in analytics
The Analytics page SHALL display the FCR rate (FCR tickets / total resolved tickets) as a percentage, with a trend line over the selected date range. FCR rate SHALL also be shown per agent.

#### Scenario: View FCR rate
- **WHEN** a supervisor opens the Analytics page
- **THEN** they see overall FCR rate and a trend chart

#### Scenario: View per-agent FCR rate
- **WHEN** a supervisor views agent performance
- **THEN** each agent's FCR rate is displayed alongside their other metrics

### Requirement: Configurable FCR time window
Admins SHALL configure the FCR time window (default: 60 minutes) in system settings.

#### Scenario: Change FCR window
- **WHEN** an admin sets the FCR window to 30 minutes
- **THEN** only tickets resolved within 30 minutes of creation qualify as FCR
