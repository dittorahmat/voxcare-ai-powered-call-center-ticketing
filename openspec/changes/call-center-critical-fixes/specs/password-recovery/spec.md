## ADDED Requirements

### Requirement: Password Recovery via Email
Users SHALL request a password reset by entering their email on the login page. The system SHALL generate a single-use reset token (valid 1 hour), send a reset link via SendGrid, and allow the user to set a new password. The token SHALL be invalidated after use or expiration.

#### Scenario: User requests password reset
- **WHEN** a user enters their email on the "Forgot Password" page
- **THEN** a reset email with a time-limited link is sent

#### Scenario: User sets new password via reset link
- **WHEN** a user clicks the reset link and enters a new valid password
- **THEN** the password is updated and all existing sessions are invalidated
