## MODIFIED Requirements

### Requirement: Admin Sidebar Navigation
The sidebar SHALL display a navigation item for User Management (`/admin/users`) when the authenticated user has the `admin` role. The item SHALL appear in a dedicated "Administration" section below the "Supervision" section.

#### Scenario: Admin sees User Management nav
- **WHEN** an admin user views the sidebar
- **THEN** a "User Management" link appears in an "Administration" section

#### Scenario: Non-admin does not see nav
- **WHEN** an agent or supervisor views the sidebar
- **THEN** the User Management link is not shown
