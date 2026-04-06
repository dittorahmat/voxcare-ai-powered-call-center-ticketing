## ADDED Requirements

### Requirement: User Registration and Authentication
The system SHALL support user authentication via email and password. Passwords SHALL be hashed using PBKDF2 with a minimum of 100,000 iterations and a 256-bit derived key. On successful authentication, the system SHALL issue an access token (JWT, 1-hour expiry) and a refresh token (7-day expiry).

#### Scenario: Successful login
- **WHEN** a user submits valid email and password credentials
- **THEN** the system returns an access JWT and a refresh token

#### Scenario: Failed login with wrong password
- **WHEN** a user submits an incorrect password
- **THEN** the system returns a 401 error with a generic "Invalid credentials" message

#### Scenario: Login with non-existent email
- **WHEN** a user attempts to log in with an email not registered in the system
- **THEN** the system returns a 401 error with a generic "Invalid credentials" message

### Requirement: Token-Based Session Management
The system SHALL validate JWT access tokens on all authenticated API endpoints using `@hono/jwt` middleware. Expired or invalid tokens SHALL return 401. The system SHALL support token refresh via a dedicated endpoint that accepts a valid refresh token and issues a new access token.

#### Scenario: Accessing protected endpoint with valid token
- **WHEN** a request includes a valid, non-expired JWT in the Authorization header
- **THEN** the request proceeds and the user identity is available in the request context

#### Scenario: Accessing protected endpoint with expired token
- **WHEN** a request includes an expired JWT
- **THEN** the system returns 401 with an "Token expired" error

#### Scenario: Refreshing an expired access token
- **WHEN** a user sends a valid refresh token to the refresh endpoint
- **THEN** the system issues a new access token and returns it

### Requirement: Role-Based Access Control
The system SHALL enforce three roles: `agent`, `supervisor`, and `admin`. Each role SHALL have specific permissions as defined in the access matrix. Role checks SHALL be enforced on both frontend routes and backend API endpoints.

#### Scenario: Agent accessing analytics dashboard
- **WHEN** a user with role `agent` attempts to access `/analytics`
- **THEN** the system returns 403 Forbidden

#### Scenario: Supervisor accessing analytics dashboard
- **WHEN** a user with role `supervisor` attempts to access `/analytics`
- **THEN** the request succeeds and the analytics page is displayed

#### Scenario: Admin managing system settings
- **WHEN** a user with role `admin` accesses `/settings`
- **THEN** the settings page is displayed with all configuration options

### Requirement: User Profile Management
The system SHALL allow authenticated users to view and update their own profile, including display name, email (admin-only), and notification preferences. Users SHALL NOT be able to change their own role — only admins can manage roles.

#### Scenario: User updating their display name
- **WHEN** an authenticated user submits a PATCH request to update their display name
- **THEN** the update succeeds and the new name is reflected in subsequent requests

#### Scenario: Agent attempting to change their own role
- **WHEN** a user with role `agent` attempts to set their role to `supervisor`
- **THEN** the system returns 403 Forbidden

### Requirement: Admin User Management
The system SHALL allow admin users to create, list, update, and deactivate other user accounts. Deactivated users SHALL NOT be able to log in but SHALL retain their historical ticket assignments and activity records.

#### Scenario: Admin creating a new agent account
- **WHEN** an admin submits a valid user creation form with email, password, name, and role
- **THEN** a new user is created and appears in the user list

#### Scenario: Admin deactivating a user
- **WHEN** an admin deactivates a user account
- **THEN** the user cannot log in but their previously assigned tickets remain attributed to them

### Requirement: Protected Route Architecture
The frontend SHALL wrap all authenticated routes in a `<ProtectedRoute>` component that redirects unauthenticated users to the login page. Role-restricted routes SHALL additionally use a `<RoleGuard>` component.

#### Scenario: Unauthenticated user accessing dashboard
- **WHEN** an unauthenticated user navigates to `/`
- **THEN** the user is redirected to `/login` with a return URL parameter

#### Scenario: Authenticated user accessing login page
- **WHEN** an authenticated user navigates to `/login`
- **THEN** the user is redirected to the dashboard
