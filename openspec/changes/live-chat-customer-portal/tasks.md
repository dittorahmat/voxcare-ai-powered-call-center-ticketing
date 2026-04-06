## 1. Customer Data Model Extension

- [x] 1.1 Add `passwordHash`, `passwordSalt`, `isActive`, `lastLoginAt`, `emailVerifiedAt`, `verificationToken`, `verificationTokenExpiry` to `Customer` interface in `worker/types.ts`
- [x] 1.2 Add `'customer'` to `UserRole` type in `worker/types.ts`
- [x] 1.3 Create `ChatSession` type in `worker/types.ts` with fields: `id`, `customerId`, `agentId`, `state` (collecting/waiting/active/closed), `aiSummary`, `transcript[]`, `createdAt`, `closedAt`, `ticketId`
- [x] 1.4 Create `ChatMessage` type in `worker/types.ts` with fields: `id`, `chatId`, `sender` (customer/agent/system), `text`, `attachments[]`, `timestamp`, `read`
- [x] 1.5 Add migration in `AppController.ensureLoaded()` to set default values for new Customer fields on existing records

## 2. Customer Authentication Backend

- [x] 2.1 Create `CustomerAuthController` Durable Object with password hashing (PBKDF2), JWT generation (24h expiry), refresh token management
- [x] 2.2 Add `POST /api/customer/auth/register` endpoint: validate input, hash password, create customer, generate verification token, send verification email via SendGrid
- [x] 2.3 Add `POST /api/customer/auth/login` endpoint: verify email/password, check `isActive`, return JWT + refresh token
- [x] 2.4 Add `POST /api/customer/auth/refresh` endpoint: validate refresh token, return new access token
- [x] 2.5 Add `POST /api/customer/auth/logout` endpoint: revoke refresh token
- [x] 2.6 Add `GET /api/customer/verify/:token` endpoint: validate token, activate account, redirect to login
- [x] 2.7 Add `POST /api/customer/auth/resend-verification` endpoint: generate new token, send email
- [x] 2.8 Add `POST /api/customer/auth/forgot-password` endpoint: generate reset token, send email
- [x] 2.9 Add `POST /api/customer/auth/reset-password` endpoint: validate token, update password
- [x] 2.10 Add rate limiting for customer auth endpoints: 5 req/min for register/login, 3 req/min for password reset

## 3. Customer Portal API Endpoints

- [x] 3.1 Add `GET /api/customer/tickets` endpoint: return tickets filtered by `customerId === token.sub`, paginated
- [x] 3.2 Add `GET /api/customer/tickets/:id` endpoint: return single ticket if owned by customer, exclude internal notes
- [x] 3.3 Add `POST /api/customer/tickets` endpoint: create ticket linked to customer, auto-assign, auto-SLA, send confirmation email
- [x] 3.4 Add `GET /api/customer/profile` endpoint: return customer profile
- [x] 3.5 Add `PATCH /api/customer/profile` endpoint: update customer name, phone, company
- [x] 3.6 Add `PATCH /api/customer/password` endpoint: change password (requires current password)
- [x] 3.7 Add customer auth middleware: validate customer JWT, ensure `role === 'customer'`, scope queries to `customerId === token.sub`

## 4. Customer Portal Pages (Frontend)

- [x] 4.1 Create `/customer/login` page with email/password form, link to register, link to forgot password
- [x] 4.2 Create `/customer/register` page with name/email/password form, password strength validation
- [x] 4.3 Create `/customer/verify/:token` page: verify token server-side, show success/error, redirect to login
- [x] 4.4 Create `/customer/forgot-password` page with email form, success message
- [x] 4.5 Create `/customer/reset-password` page with token, new password form
- [x] 4.6 Create `/customer/dashboard` page with ticket stats (total, open, resolved), recent tickets list
- [x] 4.7 Create `/customer/tickets` page with paginated ticket list, search
- [x] 4.8 Create `/customer/tickets/:id` page with ticket detail (no internal notes), attachment download
- [x] 4.9 Create `/customer/profile` page with name/phone/company edit form, password change form
- [x] 4.10 Add customer routes to `src/main.tsx` with customer auth guard
- [x] 4.11 Create customer auth context/provider (`src/context/CustomerAuthContext.tsx`) with login, logout, refresh

## 5. Live Chat Backend (LiveChatController DO)

- [x] 5.1 Create `LiveChatController` Durable Object with `chatSessions` Map and persistence methods
- [x] 5.2 Add `POST /api/chat-sessions` endpoint: create new chat session, initialize in `collecting` state, start AI greeting
- [x] 5.3 Add `GET /api/chat-sessions/:id/messages` endpoint: return message history for a chat session
- [x] 5.4 Add `POST /api/chat-sessions/:id/messages` endpoint: store new message, broadcast via SSE
- [x] 5.5 Add `GET /api/chat-sessions/:id/stream` endpoint: SSE stream for real-time message delivery
- [x] 5.6 Add typing indicator endpoints: `POST /api/chat-sessions/:id/typing` (broadcast to other party)
- [x] 5.7 Add file upload endpoint for chat: `POST /api/chat-sessions/:id/attachments` (R2 storage, 10MB max)

## 6. AI Greeting Bot

- [x] 6.1 Implement AI greeting flow in `LiveChatController`: system prompt for customer-facing info collection
- [x] 6.2 AI collects customer name and problem description via conversational turns
- [x] 6.3 AI suggests basic troubleshooting (category-dependent)
- [x] 6.4 AI generates summary: customer name, problem, suggested category, suggested priority, troubleshooting steps, transcript
- [x] 6.5 Transition chat from `collecting` to `waiting` state when AI has sufficient info

## 7. Agent Chat Queue & Routing

- [x] 7.1 Add `GET /api/chat-sessions/queue` endpoint: return waiting chats with AI summaries
- [x] 7.2 Add `POST /api/chat-sessions/:id/accept` endpoint: agent accepts chat, transitions to `active`
- [x] 7.3 Add `POST /api/chat-sessions/:id/decline` endpoint: agent declines, chat stays in `waiting`
- [x] 7.4 Add `POST /api/chat-sessions/:id/transfer` endpoint: agent transfers chat back to `waiting`
- [x] 7.5 Implement round-robin chat routing: offer to agents with < max concurrent chats (default: 2)
- [x] 7.6 Add `PATCH /api/agents/me/chat-limit` endpoint: configure max concurrent chats per agent
- [x] 7.7 Add SSE notification to agents when new chat enters `waiting` state

## 8. Agent Chat UI (Frontend)

- [x] 8.1 Create agent chat queue panel in agent dashboard: list of waiting chats with AI summaries
- [x] 8.2 Create agent live chat interface: message input, transcript display, customer info sidebar
- [x] 8.3 Add accept/decline/transfer buttons for incoming chats
- [x] 8.4 Add typing indicator display in agent chat UI
- [x] 8.5 Add file attachment support in agent chat UI
- [x] 8.6 Add "End Chat" button with "Save as ticket" / "Close without ticket" options
- [x] 8.7 Add agent chat metrics to dashboard: chats today, avg response time, active count

## 9. Chat-to-Ticket Auto-Creation

- [x] 9.1 Implement ticket creation from chat transcript: title from AI summary, description from transcript, customer link, category, priority
- [x] 9.2 Add "Save as ticket" action when agent closes chat
- [x] 9.3 Add "Close without ticket" action (archive transcript only)
- [x] 9.4 Implement 30-minute inactivity timeout → auto-close + auto-create ticket
- [x] 9.5 Send ticket-created notification when chat converts to ticket

## 10. Chat Widget (Embeddable)

- [x] 10.1 Create standalone widget JS bundle: separate Vite build target outputting `widget.js`
- [x] 10.2 Widget renders floating button (bottom-right by default) using Shadow DOM
- [x] 10.3 Widget opens chat panel with full chat UI (AI greeting → agent handoff → live chat)
- [x] 10.4 Widget supports anonymous customers (no login required)
- [x] 10.5 Widget supports logged-in customers (auto-associate with customer account)
- [x] 10.6 Widget customization via data attributes: `data-position`, `data-color`, `data-text`
- [x] 10.7 Widget SSE connection for real-time messages with heartbeat + auto-reconnect
- [x] 10.8 Widget file upload support (images, PDFs up to 10MB)

## 11. Portal Chat Page

- [x] 11.1 Create `/customer/chat` page with full-page chat interface
- [x] 11.2 Portal chat shows previous chat history for returning customers
- [x] 11.3 Same chat backend as embeddable widget

## 12. CSAT for Chat

- [x] 12.1 Add chat-specific CSAT endpoint: `POST /api/chat-sessions/:id/csat` (1-5 stars + comment)
- [x] 12.2 Send CSAT survey email after chat closes (within 5 minutes)
- [x] 12.3 Block duplicate CSAT submissions per chat session

## 13. Security & Polish

- [x] 13.1 Customer auth rate limiting: 5 req/min for register/login, 3 req/min for password reset
- [x] 13.2 CSP headers for customer portal pages
- [x] 13.3 Chat transcript auto-purge after 90 days (cron-triggered)
- [x] 13.4 Account deactivation after 1 year of inactivity (with email notification)
- [x] 13.5 Verify customer middleware prevents access to other customers' data
- [x] 13.6 Update all role-exhaustive switch statements to handle new `'customer'` role
