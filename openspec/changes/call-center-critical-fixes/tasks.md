## 1. Email Integration (SendGrid)

- [x] 1.1 Add `@sendgrid/mail` to dependencies
- [x] 1.2 Create email service module (`worker/email.ts`) with sendEmail() function using SendGrid Transactional API
- [x] 1.3 Add SendGrid API key and from-email to settings (SystemSettings type)
- [x] 1.4 Create `POST /api/email/inbound` webhook endpoint for SendGrid Inbound Parse
- [x] 1.5 Implement inbound email handler: parse email, match/create customer, create ticket
- [x] 1.6 Validate SendGrid webhook signature on inbound endpoint
- [x] 1.7 Create HTML email template for ticket notifications
- [x] 1.8 Wire email notifications on ticket created/updated/resolved (to customer)
- [x] 1.9 Wire email notifications on ticket assigned/escalated (to agent/supervisor)
- [x] 1.10 Add email configuration UI in Settings (API key, from address, from name)

## 2. Internal vs Public Notes

- [x] 2.1 Extend Ticket type with `internalNotes` array and `publicNotes` object
- [x] 2.2 Update AppController to store/retrieve internal and public notes
- [x] 2.3 Split TicketDetail page into "Internal Notes" tab and "Public Notes" tab
- [x] 2.4 Style internal notes with distinct visual indicator (amber background)
- [x] 2.5 Update email notifications to include only public notes — email service filters publicNotes
- [x] 2.6 Migrate existing `description` field to `publicNotes` for backward compatibility

## 3. Canned Responses

- [x] 3.1 Add `CannedResponse` type to worker/types.ts
- [x] 3.2 Add `cannedResponses` Map and CRUD methods to AppController
- [x] 3.3 Add GET/POST/PUT/DELETE /api/canned-responses endpoints (admin-only for CRUD, all for GET)
- [x] 3.4 Create CannedResponse management page in Settings (admin-only)
- [x] 3.5 Add canned response selector dropdown to ticket note composition
- [x] 3.6 Implement variable substitution (`{{customer_name}}`, `{{ticket_id}}`, `{{agent_name}}`)

## 4. File Attachments

- [x] 4.1 Configure Cloudflare R2 bucket binding in wrangler.jsonc
- [x] 4.2 Add `attachments` array field to Ticket type
- [x] 4.3 Create `POST /api/tickets/:id/attachments` upload endpoint with R2 storage
- [x] 4.4 Create `GET /api/tickets/:id/attachments/:key` download endpoint with signed URL
- [x] 4.5 Enforce 10MB max file size and allowed file types
- [x] 4.6 Add file upload component to TicketDetail page
- [x] 4.7 Display attachment list with image previews and download links
- [x] 4.8 Store attachments metadata in ticket's `attachments` array

## 5. Ticket Re-open

- [x] 5.1 Add `reopened` to TicketStatus type
- [x] 5.2 Add "Re-open" button to TicketDetail for resolved tickets
- [x] 5.3 Wire PATCH /api/tickets/:id to accept `reopened` status
- [x] 5.4 Create new SLA record when ticket is re-opened
- [x] 5.5 Handle inbound email to re-opened ticket (add as new note, don't create new ticket)

## 6. SLA Auto-Creation

- [x] 6.1 Create `createSLARecord(ticketId, priority)` helper function
- [x] 6.2 Wire SLA auto-creation into POST /api/tickets handler
- [x] 6.3 Wire SLA auto-creation into email-to-ticket handler

## 7. Auto-Assignment

- [x] 7.1 Implement `getAssignedAgent(controller)` round-robin function
- [x] 7.2 Wire auto-assignment into POST /api/tickets handler
- [x] 7.3 Wire auto-assignment into email-to-ticket handler
- [x] 7.4 Update agent `lastAssignedAt` and `availability` on assignment

## 8. Business Hours SLA

- [x] 8.1 Create `calculateWorkingMinutes(from, to, workingHours, holidays)` utility
- [x] 8.2 Update SLA timer display to show effective remaining time using working minutes
- [x] 8.3 Update SLA breach detection to consider business hours
- [x] 8.4 Add working hours config to SystemSettings (start/end time)

## 9. Holiday Schedules

- [x] 9.1 Add `Holiday` type to worker/types.ts
- [x] 9.2 Add `holidays` Map and CRUD methods to AppController
- [x] 9.3 Add GET/POST/DELETE /api/holidays endpoints (admin-only)
- [x] 9.4 Create holiday management UI in Settings (date picker + name)
- [x] 9.5 Integrate holidays into business hours SLA calculation — holidays passed to calculateWorkingMinutes

## 10. Two-Factor Authentication

- [x] 10.1 Add `otpauth` to dependencies
- [x] 10.2 Extend User type with `totpSecret`, `is2faEnabled`
- [x] 10.3 Create `POST /api/auth/2fa/setup` endpoint (generates secret, returns QR code)
- [x] 10.4 Create `POST /api/auth/2fa/verify` endpoint (verifies TOTP code, enables 2FA)
- [x] 10.5 Create `POST /api/auth/2fa/disable` endpoint
- [x] 10.6 Modify login flow: after password check, if 2FA enabled, require TOTP code
- [x] 10.7 Create 2FA setup UI in ProfileSettings (QR code display, code input)
- [x] 10.8 Create TOTP code input step in LoginPage
- [x] 10.9 Enforce 2FA for admin role (cannot disable)

## 11. Password Recovery

- [x] 11.1 Add `PasswordReset` type with token, userId, expiresAt
- [x] 11.2 Add password reset storage to AuthController
- [x] 11.3 Create `POST /api/auth/forgot-password` endpoint (generates token, sends email)
- [x] 11.4 Create `POST /api/auth/reset-password` endpoint (validates token, sets new password)
- [x] 11.5 Create "Forgot Password" link on LoginPage
- [x] 11.6 Create ForgotPassword page with email input
- [x] 11.7 Create ResetPassword page with new password input (accessed via reset link)
- [x] 11.8 Wire email sending for reset link via SendGrid — wired in forgot-password endpoint

## 12. Password Strength

- [x] 12.1 Create password validation utility (min 8 chars, uppercase, lowercase, number)
- [x] 12.2 Add validation to registration endpoint (POST /api/auth/register)
- [x] 12.3 Add validation to password change endpoint (PATCH /api/auth/password)
- [x] 12.4 Add validation to password reset endpoint
- [x] 12.5 Add real-time password strength meter to registration and reset forms

## 13. Rate Limiting

- [x] 13.1 Create `RateLimiter` Durable Object with sliding window counter
- [x] 13.2 Register RateLimiter binding in wrangler.jsonc
- [x] 13.3 Create rate limiting middleware with per-IP tracking
- [x] 13.4 Apply rate limit: 100 req/min for general API, 10 req/min for auth endpoints
- [x] 13.5 Return HTTP 429 with `Retry-After` header when limit exceeded
- [x] 13.6 Wire rate limiter into worker/index.ts middleware chain — wired in userRoutes coreRoutes

## 14. Agent Availability

- [x] 14.1 Extend availability enum: `available | busy | break | lunch | offline`
- [x] 14.2 Update agent status UI with all new states
- [x] 14.3 Update auto-assignment to only consider `available` agents
- [x] 14.4 Add visual status indicator (color-coded badges) in agent queue

## 15. Agent Queue Dashboard

- [x] 15.1 Create `src/pages/Admin/AgentQueue.tsx` dashboard page
- [x] 15.2 Display agent table: name, status (color-coded), active tickets, last assigned, resolved today
- [x] 15.3 Auto-refresh every 30 seconds
- [x] 15.4 Wire `/admin/queue` route with supervisor role guard
- [x] 15.5 Add nav link to sidebar (supervisor+ only)

## 16. Audit Log IP Capture

- [x] 16.1 Create middleware to extract `cf-connecting-ip` header
- [x] 16.2 Inject IP into request context
- [x] 16.3 Update audit log append to capture IP from context
