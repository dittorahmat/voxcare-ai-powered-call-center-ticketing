## ADDED Requirements

### Requirement: User Management Page
The system SHALL provide an admin-only page at `/admin/users` listing all users with columns: name, email, role, availability status, active/deactivated, and creation date. Admins SHALL be able to create new users, edit roles, and deactivate/reactivate users from this page.

#### Scenario: Admin views user list
- **WHEN** an admin navigates to `/admin/users`
- **THEN** the user table loads with all users and action buttons

#### Scenario: Admin creates a new user
- **WHEN** an admin fills the "New User" form with email, password, name, and role
- **THEN** the user is created and appears in the table

#### Scenario: Admin changes user role
- **WHEN** an admin changes a user's role from agent to supervisor
- **THEN** the user's role is updated and the change is reflected immediately

### Requirement: Password Change Endpoint
The system SHALL expose `PATCH /api/auth/password` allowing authenticated users to change their own password by providing their current password and a new password. On success, all existing sessions SHALL be invalidated except the current one.

#### Scenario: User changes own password
- **WHEN** a user submits current password and new password
- **THEN** the password is updated and other sessions are invalidated

### Requirement: Admin Password Reset
Admins SHALL be able to reset any user's password via the user management page. The admin SHALL provide a new password, and all of that user's sessions SHALL be invalidated.

#### Scenario: Admin resets user password
- **WHEN** an admin sets a new password for a user
- **THEN** the password is updated and all of that user's sessions are revoked

### Requirement: User Avatar/Initials
The User type SHALL include an optional `avatarDataUrl` field. If set, the avatar is displayed as the image. If not set, initials are generated from the user's name. The settings profile SHALL allow uploading an avatar image (stored as base64 data URL, max 50KB).

#### Scenario: User with no avatar
- **WHEN** a user has no `avatarDataUrl`
- **THEN** their initials (first letter of first and last name) are displayed in a colored circle

#### Scenario: User uploads avatar
- **WHEN** a user uploads an image on their profile
- **THEN** the image is stored as `avatarDataUrl` and displayed in the header and sidebar
