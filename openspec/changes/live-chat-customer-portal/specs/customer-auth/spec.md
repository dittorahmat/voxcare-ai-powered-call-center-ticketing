## ADDED Requirements

### Requirement: Customer self-registration with email verification
The system SHALL allow new customers to create an account by providing their name, email, and password. After registration, the system SHALL send a verification email to the customer. The account SHALL remain inactive until the customer clicks the verification link.

#### Scenario: Successful registration
- **WHEN** a customer submits the registration form with a valid email, name, and password (min 8 chars, 1 uppercase, 1 lowercase, 1 number)
- **THEN** the system creates a customer record with `isActive: false`, generates a verification token, and sends a verification email

#### Scenario: Duplicate email registration
- **WHEN** a customer tries to register with an email that already exists in the system
- **THEN** the system returns a 409 Conflict error with message "Email already registered"

#### Scenario: Weak password registration
- **WHEN** a customer submits a password that does not meet complexity requirements
- **THEN** the system returns a 400 Bad Request with validation errors

#### Scenario: Verification email sent
- **WHEN** a customer successfully registers
- **THEN** the system sends an email to the customer with a verification link containing a unique token

### Requirement: Email verification
The system SHALL verify a customer's email when they click the verification link. The verification token SHALL expire after 24 hours. Upon successful verification, the customer's account SHALL be activated.

#### Scenario: Successful verification
- **WHEN** a customer clicks a valid, non-expired verification link
- **THEN** the system sets `isActive: true` and `emailVerifiedAt` to the current timestamp, and redirects to the login page with a success message

#### Scenario: Expired verification token
- **WHEN** a customer clicks a verification link older than 24 hours
- **THEN** the system returns a 400 error with option to resend verification email

#### Scenario: Invalid verification token
- **WHEN** a customer clicks a verification link with an invalid token
- **THEN** the system returns a 404 error

#### Scenario: Resend verification email
- **WHEN** a customer requests a new verification email after the original expired
- **THEN** the system generates a new token and sends a new verification email

### Requirement: Customer login
The system SHALL allow registered, verified customers to log in using their email and password. Upon successful login, the system SHALL return a JWT access token (24h expiry) and a refresh token (7d expiry).

#### Scenario: Successful login
- **WHEN** a verified customer submits valid email and password
- **THEN** the system returns an access token (24h expiry) and refresh token (7d expiry) with role "customer"

#### Scenario: Login with unverified account
- **WHEN** an unverified customer attempts to log in
- **THEN** the system returns a 403 error with message "Please verify your email first" and a link to resend verification

#### Scenario: Failed login
- **WHEN** a customer submits incorrect email or password
- **THEN** the system returns a 401 error with generic message "Invalid credentials"

### Requirement: Customer password reset
The system SHALL allow customers to reset their password via email. A reset token SHALL be generated and emailed to the customer. The token SHALL expire after 1 hour.

#### Scenario: Password reset request
- **WHEN** a customer submits their email on the forgot password page
- **THEN** the system generates a reset token and sends a password reset email (regardless of whether the email exists)

#### Scenario: Successful password reset
- **WHEN** a customer submits a valid reset token and new password
- **THEN** the system updates the password hash and returns success

### Requirement: Customer role in UserRole
The `UserRole` type SHALL include `'customer'` as a valid role, making it `'agent' | 'supervisor' | 'admin' | 'customer'`.

#### Scenario: Customer role in JWT
- **WHEN** a customer logs in
- **THEN** their JWT payload contains `role: "customer"`

#### Scenario: Customer role excluded from internal checks
- **WHEN** middleware checks for `agent`, `supervisor`, or `admin` roles
- **THEN** customers are NOT granted access to internal-only endpoints

### Requirement: Rate limiting for customer auth endpoints
Customer authentication endpoints SHALL have separate rate limits: 5 requests per minute per IP for registration and login, 3 requests per minute per IP for password reset.

#### Scenario: Registration rate limit
- **WHEN** an IP sends more than 5 registration requests per minute
- **THEN** the system returns 429 Too Many Requests

#### Scenario: Login rate limit
- **WHEN** an IP sends more than 5 login requests per minute
- **THEN** the system returns 429 Too Many Requests
