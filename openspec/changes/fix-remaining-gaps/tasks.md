## 1. Critical Fix: SSE Notifications

- [x] 1.1 Import and call `useNotificationStream()` hook in MainLayout component
- [x] 1.2 Connect SSE event handler to update unread count on incoming events
- [x] 1.3 Trigger sound alert when SSE notification received (if soundEnabled)
- [x] 1.4 Trigger desktop notification when SSE notification received (if desktopEnabled)

## 2. Analytics Range Filter Fix

- [x] 2.1 Compute `from` and `to` ISO dates from selected range (Today/7d/30d)
- [x] 2.2 Pass `?from=` and `?to=` query params to analytics API calls
- [x] 2.3 Show "No data for selected range" when API returns empty

## 3. Security: replace Hardcoded Secrets

- [x] 3.1 Remove hardcoded `JWT_SECRET`, `CF_AI_BASE_URL`, `CF_AI_API_KEY` from wrangler.jsonc vars
- [x] 3.2 Add comments in wrangler.jsonc documenting required secrets
- [x] 3.3 Update README with `wrangler secret put` commands for all three secrets

## 4. Bulk Assign Fix

- [x] 4.1 Fetch agents from `GET /api/agents` in Tickets page on mount
- [x] 4.2 Pass agents array to BulkActionBar component

## 5. Live Call: Save Call Record

- [x] 5.1 Call `POST /api/calls` in LiveCall onSave handler with transcript, duration, and ticket ID
- [x] 5.2 Link created call record to the created ticket

## 6. Dashboard Greeting Fix

- [x] 6.1 Replace hardcoded "Welcome back, Jane" with `user?.name` from useAuth()

## 7. Admin Nav Link

- [x] 7.1 Add "User Management" nav item to sidebar for admin role only
- [x] 7.2 Place in dedicated "Administration" section after "Supervision"

## 8. CustomerDetail Edit

- [x] 8.1 Add "Edit" button to CustomerDetails page
- [x] 8.2 Create edit dialog pre-filled with customer data
- [x] 8.3 Wire save to `PATCH /api/customers/:id` and refresh display

## 9. 404 Page

- [x] 9.1 Create `src/pages/NotFound.tsx` component with branding and "Return to Dashboard"
- [x] 9.2 Replace wildcard route redirect with NotFound component in main.tsx

## 10. Settings Nav Placement

- [x] 10.1 Move "Settings" nav item from sidebar footer to main navigation group
- [x] 10.2 Remove duplicate footer settings link
