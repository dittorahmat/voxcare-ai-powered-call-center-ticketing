## Why

VoxCare currently lacks two critical capabilities that every modern call center needs: **real-time live chat with customers** and a **customer self-service portal**. Customers can only interact via email (inbound/outbound) or view a single ticket via a public token link — they cannot initiate conversations, chat with agents in real-time, or manage their own tickets. Agents have no way to receive or handle live chat conversations. This change closes both gaps simultaneously by introducing a hybrid AI-assisted live chat system (AI greeting → info collection → human agent handoff) and a full customer portal with registration, authentication, ticket management, and in-portal chat.

## What Changes

### Customer Authentication & Portal
- **Customer self-registration** — Open registration with email verification (SendGrid). Customers create accounts with name, email, and password.
- **Customer login** — Separate customer auth endpoints (`POST /api/customer/auth/register`, `POST /api/customer/auth/login`) using the existing PBKDF2+JWT infrastructure. Customer JWTs have longer expiry (24h).
- **Customer portal pages** — `/customer/login`, `/customer/register`, `/customer/verify/:token`, `/customer/forgot-password`, `/customer/dashboard`, `/customer/tickets`, `/customer/tickets/:id`, `/customer/profile`
- **Self-service ticket management** — Customers can view all their tickets, submit new tickets, view ticket details, and update their profile.

### Live Chat System (Hybrid Flow C)
- **AI greeting bot** — When a customer starts a chat, an AI bot greets them, collects their name and problem description, generates a summary and draft ticket, then routes to an available agent.
- **Agent chat queue** — Agents see incoming chats with AI-generated summaries (customer name, problem, suggested category/priority, full transcript). Agents can accept, transfer, or decline.
- **Real-time messaging** — SSE-based bidirectional chat between customer and agent. Typing indicators, read receipts, file attachment support.
- **Chat-to-ticket auto-creation** — When a chat ends (agent closes or timeout), the full transcript is saved as a ticket with the AI summary as notes.
- **Embeddable chat widget** — A standalone JavaScript widget (`<script src="https://voxcare.com/widget.js">`) that can be embedded on any external website. Also available as a full page within the customer portal.

### Customer Data Model Extension
- **Extended Customer entity** — Add `passwordHash`, `passwordSalt`, `isActive`, `lastLoginAt`, `emailVerifiedAt` fields to support customer authentication.
- **Customer role** — Add `'customer'` to the `UserRole` type, making it `'agent' | 'supervisor' | 'admin' | 'customer'`.

### Agent Dashboard Extensions
- **Incoming chat queue** — Real-time display of waiting chats with AI summaries.
- **Live chat UI** — Full chat interface within the agent dashboard for handling customer conversations.
- **Chat metrics** — Chats handled today, average response time, customer satisfaction per chat.

## Capabilities

### New Capabilities

- `customer-auth`: Customer self-registration with email verification, customer login, password reset, customer JWT with extended expiry
- `customer-portal`: Customer-facing pages (dashboard, ticket list, ticket detail, profile, settings) with customer-scoped access
- `live-chat`: Real-time SSE-based live chat between customers and agents, AI greeting bot, agent handoff, typing indicators, read receipts
- `chat-widget`: Embeddable JavaScript chat widget for external websites, plus full-page version within customer portal
- `chat-routing`: AI-assisted chat routing with summary generation, agent queue management, accept/transfer/decline workflow
- `chat-to-ticket`: Automatic ticket creation from chat transcripts with AI summary as ticket notes
- `customer-ticket-submission`: Customers can create and view their own tickets through the portal

### Modified Capabilities

<!-- No existing specs to modify (openspec/specs/ is empty) -->

## Impact

- **Backend Worker**: New `CustomerAuthController` Durable Object (or extend existing `AuthController`) with customer-specific auth methods. New `/api/customer/*` endpoints for customer auth, profile, and ticket management. New `/api/chat/*` endpoints for live chat (SSE-based messaging). Extended `Customer` type with auth fields. Extended `UserRole` to include `'customer'`. New `ChatSession` type with customer linkage and AI summary fields.
- **Frontend**: ~10 new customer portal pages (login, register, verify, dashboard, tickets, profile). New live chat UI within agent dashboard. New embeddable widget component (standalone JS bundle, no React dependency).
- **Database/DO**: `Customer` map gains `passwordHash`, `passwordSalt`, `isActive`, `lastLoginAt`, `emailVerifiedAt`. New `ChatSessions` map for live chat state.
- **Dependencies**: No new dependencies beyond existing stack (uses SSE pattern already in place, SendGrid for email verification).
- **Breaking**: Adding `'customer'` to `UserRole` type may require updating any role-exhaustive switch statements. Extending `Customer` type with new fields requires migration for existing customer records (default to `null`/`false`).
- **External Services**: SendGrid for email verification emails.
