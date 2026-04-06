## ADDED Requirements

### Requirement: TOTP-based Two-Factor Authentication
Users SHALL enable 2FA via their profile settings. The system SHALL generate a TOTP secret, display a QR code for scanning with an authenticator app, and require a verification code to confirm setup. Once enabled, login SHALL require both password and a valid TOTP code (6-digit, 30-second window). Admin role SHALL have 2FA enforced (cannot be disabled).

#### Scenario: User enables 2FA
- **WHEN** a user scans the QR code and enters a valid TOTP code
- **THEN** 2FA is enabled for their account

#### Scenario: Login with 2FA enabled
- **WHEN** a user with 2FA enabled enters correct password
- **THEN** they are prompted for a TOTP code before access is granted

#### Scenario: Invalid TOTP code rejected
- **WHEN** a user enters an expired or incorrect TOTP code
- **THEN** login is denied with "Invalid authentication code" error
