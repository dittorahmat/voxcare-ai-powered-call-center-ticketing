## ADDED Requirements

### Requirement: 404 Page Not Found
The system SHALL display a dedicated "Page Not Found" component when a user navigates to an unrecognized route. The component SHALL include: VoxCare branding, a "Page not found" message, a "Return to Dashboard" button linking to `/`, and an optional "Report broken link" action. The wildcard route in `main.tsx` SHALL render this component instead of redirecting to `/`.

#### Scenario: User navigates to unknown route
- **WHEN** a user navigates to `/nonexistent-page`
- **THEN** the 404 page is displayed with a "Return to Dashboard" button

#### Scenario: User clicks Return to Dashboard
- **WHEN** a user clicks "Return to Dashboard" on the 404 page
- **THEN** the user is navigated to the `/` route
