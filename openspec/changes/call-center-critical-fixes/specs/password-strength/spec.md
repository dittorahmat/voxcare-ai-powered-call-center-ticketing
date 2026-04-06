## ADDED Requirements

### Requirement: Password Strength Enforcement
The system SHALL enforce password complexity rules on registration and password change: minimum 8 characters, at least 1 uppercase letter, at least 1 lowercase letter, at least 1 number. The frontend SHALL display real-time validation feedback. The backend SHALL reject passwords that do not meet criteria.

#### Scenario: Weak password rejected
- **WHEN** a user tries to register with password "abc123"
- **THEN** registration fails with "Password must be at least 8 characters with uppercase, lowercase, and number"

#### Scenario: Strong password accepted
- **WHEN** a user registers with password "SecurePass1"
- **THEN** the password is accepted and the user is created
