## 1. Email Notifications (SendGrid Integration)

- [x] 1.1 Wire up SendGrid outbound email in `worker/email-service.ts` — replace console.log stubs with actual `@sendgrid/mail` API calls for ticket created, updated, resolved events
- [x] 1.2 Create HTML email templates (ticket created, ticket updated, ticket resolved) with variable substitution support
- [x] 1.3 Store email templates in AppController DO storage with admin CRUD endpoints (`GET/PUT /api/email-templates`)
- [x] 1.4 Generate public ticket view token (UUID v4) on ticket creation, store on `Ticket.publicToken`
- [x] 1.5 Create public ticket view page at `/public/ticket/:token` — read-only, shows title/status/description/public notes/resolution, hides internal notes
- [x] 1.6 Update email notification triggers in `POST /api/tickets` and `PATCH /api/tickets/:id` to send actual emails via SendGrid
- [x] 1.7 Add email threading display to ticket detail page — chronological view of inbound/outbound emails inline with activity
- [x] 1.8 Create email template management settings page (`/settings/email-templates`) for admin to edit templates
- [x] 1.9 Add email template settings nav link to System Settings page

## 2. Ticket Tags

- [x] 2.1 Add `tags: string[]` field to Ticket type in `worker/types.ts`
- [x] 2.2 Update ticket create/update endpoints to accept and persist tags
- [x] 2.3 Add `GET /api/tags` endpoint to list all unique tags across tickets (for autocomplete)
- [x] 2.4 Create TagInput component with autocomplete from existing tags
- [x] 2.5 Add tag input/editing to TicketDetail page (tag chips with remove button)
- [x] 2.6 Add tag filter to TicketList page with multi-select (OR logic)
- [x] 2.7 Add tag breakdown chart to Analytics page (count and percentage per tag)
- [x] 2.8 Audit log tag changes on ticket update

## 3. Saved Views

- [x] 3.1 Create `SavedView` type: `{ id, userId, name, filters, sort, isDefault, createdAt }`
- [x] 3.2 Add `savedViews` Map to AppController DO with CRUD endpoints (`GET/POST/PATCH/DELETE /api/views`)
- [x] 3.3 Create system default views: "All Open", "Unassigned", "SLA Breached", "My Tickets"
- [x] 3.4 Create SaveViewDialog component (name input, scope toggle)
- [x] 3.5 Add saved views sidebar to TicketList page (per-user views + system defaults)
- [x] 3.6 Implement "Apply View" — clicking saved view applies its filters and sort to ticket list
- [x] 3.7 Add edit/delete saved view actions (context menu on view name)

## 4. Related Tickets

- [x] 4.1 Create `TicketRelation` type: `{ id, ticketA, ticketB, type: "parent-child" | "related", createdAt }`
- [x] 4.2 Add `ticketRelations` Map to AppController DO with CRUD endpoints (`GET/POST/DELETE /api/ticket-relations`)
- [x] 4.3 Create RelatedTicketsPanel component for ticket detail page
- [x] 4.4 Add "Link Ticket" dialog to ticket detail page (search + relationship type selector)
- [x] 4.5 Display bidirectional relations on both linked tickets
- [x] 4.6 Add unlink button on relation entries (supervisor+/admin only)
- [x] 4.7 Audit log relation creation and deletion

## 5. Ticket Merge

- [x] 5.1 Add `mergedInto: string | null` and `status: "merged"` to Ticket type
- [x] 5.2 Create `POST /api/tickets/:id/merge` endpoint accepting `{ sourceTicketIds: string[] }`
- [x] 5.3 Implement merge logic: primary ticket absorbs notes, attachments, transcript from source tickets; source tickets set to `merged` status with `mergedInto` pointer
- [x] 5.4 Create MergeTicketsDialog component (select primary ticket, preview merge, confirm)
- [x] 5.5 Add "Merge" action to ticket list bulk actions and ticket detail page
- [x] 5.6 Make merged tickets read-only with prominent link to primary ticket
- [x] 5.7 Audit log merge events (which tickets, by whom, into which primary)

## 6. CSAT Surveys

- [x] 6.1 Create `CSATResponse` type: `{ id, ticketId, rating (1-5), comment, submittedAt, customerEmail }`
- [x] 6.2 Add `csatResponses` Map to AppController DO with endpoints (`POST /api/csat`, `GET /api/csat/stats`)
- [x] 6.3 Add CSAT survey form to public ticket view page (star rating + optional comment)
- [x] 6.4 Trigger CSAT email on ticket resolution (extend existing email notification flow)
- [x] 6.5 Implement CSAT reminder email after 24 hours (cron-triggered check for unresolved CSAT)
- [x] 6.6 Block duplicate CSAT submissions per ticket
- [x] 6.7 Add CSAT dashboard widget to Analytics page (avg score, response rate, trend chart, recent responses table)
- [x] 6.8 Add CSAT data to per-agent performance table
- [x] 6.9 Implement CSAT auto-cleanup for responses older than 90 days

## 7. Auto-Close Rules

- [x] 7.1 Create `AutoCloseRule` type: `{ id, name, condition, action, enabled, createdAt }`
- [x] 7.2 Add `autoCloseRules` Map to AppController DO with CRUD endpoints (`GET/POST/PATCH/DELETE /api/auto-close-rules`)
- [x] 7.3 Create AutoCloseRules settings page (`/settings/auto-close`) for admin management
- [x] 7.4 Implement cron-triggered evaluation function (Cloudflare Cron Trigger at 00:00 UTC)
- [x] 7.5 Implement rule evaluation logic: iterate tickets, match conditions, apply actions
- [x] 7.6 Auto-close action: set status to `closed`, add internal note referencing the rule
- [x] 7.7 Audit log all auto-close actions with rule name and ticket ID
- [x] 7.8 Add `closed` status to ticket status enum if not already present

## 8. Skills-Based Routing

- [x] 8.1 Create category-to-skills mapping config in settings (`categorySkillsMap: Record<string, string[]>`)
- [x] 8.2 Add category-to-skills mapping UI to System Settings page
- [x] 8.3 Update auto-assignment logic in `POST /api/tickets`: first find agents with matching skills, round-robin among matches, fallback to all available agents
- [x] 8.4 Update manual assignment dialog to suggest skilled agents first (sorted by skill match)
- [x] 8.5 Test skill-based routing with various scenarios (match found, no match, no agents available)

## 9. SLA Breach Workflow

- [x] 9.1 Add `escalationTriggered: boolean` field to SLARecord type
- [x] 9.2 Implement auto-escalation function: detect breach, bump priority one level (low→medium→high→critical), set `escalationTriggered: true`
- [x] 9.3 Integrate auto-escalation into cron-triggered SLA evaluation and ticket load logic
- [x] 9.4 Create SSE notification for supervisors/admins on SLA breach (extend existing notification system)
- [x] 9.5 Send SLA breach email to all supervisors via SendGrid
- [x] 9.6 Audit log SLA breach escalations with trigger reason
- [x] 9.7 Test: critical priority ticket breaches SLA → no further escalation, notification sent

## 10. Break Management

- [x] 10.1 Extend agent availability enum: add `break` and `lunch` states (verify existing states: available, busy, offline)
- [x] 10.2 Create `BreakLog` type: `{ id, userId, reason, startedAt, endedAt, durationSeconds }`
- [x] 10.3 Add `breakLogs` Map to AppController DO with endpoints (`GET /api/breaks`, `POST /api/breaks/start`, `POST /api/breaks/end`)
- [x] 10.4 Update sidebar availability selector to include break/lunch options with reason dialog
- [x] 10.5 Update Agent Queue dashboard to show break status and elapsed duration per agent
- [x] 10.6 Auto-end break when agent changes status to available/busy
- [x] 10.7 Audit log all break start/end events

## 11. Shift Scheduling

- [x] 11.1 Create `ShiftSchedule` type: `{ id, weekNumber, year, entries: [{ day, startTime, endTime, agentIds[] }] }`
- [x] 11.2 Add `shiftSchedules` Map to AppController DO with CRUD endpoints (`GET/POST/PATCH/DELETE /api/shifts`)
- [x] 11.3 Create Shift Schedule management page (`/admin/shifts`) with weekly calendar view
- [x] 11.4 Implement weekly schedule editor (add/remove shifts, assign agents per slot)
- [x] 11.5 Add "My Shifts" section to agent profile settings page
- [x] 11.6 Implement coverage heatmap on shift schedule page (agent count per time slot, gaps highlighted)
- [x] 11.7 Use system timezone for all shift times

## 12. FCR Tracking

- [x] 12.1 Add `fcrFlag: boolean` and `fcrTimeWindowMinutes: number` (default 60) to Ticket type / system settings
- [x] 12.2 Implement FCR detection logic on ticket resolution: check resolvedAt - createdAt <= window, no follow-ups, no reopen
- [x] 12.3 Update ticket resolution handler to set `fcrFlag`
- [x] 12.4 Add FCR rate stat card to Analytics page
- [x] 12.5 Add FCR trend line chart to Analytics page
- [x] 12.6 Add per-agent FCR rate to agent performance table
- [x] 12.7 Add FCR time window configuration to System Settings page
- [x] 12.8 Remove FCR flag when ticket is reopened after resolution

## 13. AHT Tracking

- [x] 13.1 Add `handleTimeSeconds: number | null` to Ticket type
- [x] 13.2 Calculate handle time on ticket resolution: `resolvedAt - assignedAt` (or `resolvedAt - createdAt` if unassigned)
- [x] 13.3 Add overall AHT stat card to Analytics page
- [x] 13.4 Add per-agent AHT to agent performance table
- [x] 13.5 Add AHT trend line chart (daily average) to Analytics page
- [x] 13.6 Include AHT data in CSV export from Analytics page

## 14. Real-Time Wallboard

- [x] 14.1 Create `GET /api/wallboard` endpoint returning aggregated metrics: agent counts, ticket counts by status, SLA compliance, today's stats, avg first response time, top 5 agents
- [x] 14.2 Create Wallboard page at `/wallboard` with full-screen layout
- [x] 14.3 Implement large-font, high-contrast wallboard UI with stat cards and charts
- [x] 14.4 Add SLA compliance color coding: green (>90%), yellow (75-90%), red (<75%)
- [x] 14.5 Implement 15-second auto-refresh with Page Visibility API pause when tab hidden
- [x] 14.6 Add wallboard link to main navigation (visible to all authenticated users)

## 15. PDF Reports

- [x] 15.1 Install `@react-pdf/renderer` dependency
- [x] 15.2 Create PDF report components: TicketSummaryReport, SLAComplianceReport, AgentPerformanceReport
- [x] 15.3 Add "Export PDF" button to Analytics page with report type selector
- [x] 15.4 Include date range and generation timestamp in all PDF report headers
- [x] 15.5 Include company branding (name, logo) from system settings in PDF headers
- [x] 15.6 Test PDF generation for each report type with realistic data

## 16. Ticket PDF Export

- [x] 16.1 Create TicketDetailPdf component using `@react-pdf/renderer` — includes metadata, transcript, notes, attachments list, timeline
- [x] 16.2 Add "Export PDF" button to ticket detail page
- [x] 16.3 Include internal notes in PDF only for users with agent/supervisor/admin role
- [x] 16.4 Include company branding in ticket PDF header
- [x] 16.5 Add "Send PDF to Customer" button — attaches PDF to email with optional message body
- [x] 16.6 Implement print-friendly CSS layout for ticket detail page (hide sidebar, nav, interactive elements)

## 17. Scheduled Reports

- [x] 17.1 Create `ScheduledReport` type: `{ id, type, schedule, recipients, dateRange, enabled, lastRunAt, nextRunAt }`
- [x] 17.2 Add `scheduledReports` Map to AppController DO with CRUD endpoints (`GET/POST/PATCH/DELETE /api/scheduled-reports`)
- [x] 17.3 Create Scheduled Reports settings page (`/settings/scheduled-reports`)
- [x] 17.4 Implement cron-triggered report generation (extend existing cron infrastructure)
- [x] 17.5 Generate PDF report and send via SendGrid to configured recipients
- [x] 17.6 Log report generation failures and send admin notification on failure
- [x] 17.7 Add pause/resume functionality for scheduled reports
- [x] 17.8 Show last run time and next run time on scheduled reports list

## 18. Bulk Email to Customers

- [x] 18.1 Create `POST /api/tickets/bulk-email` endpoint accepting `{ ticketIds: string[], template: string }`
- [x] 18.2 Implement bulk email logic: iterate tickets, render per-ticket email, send via SendGrid
- [x] 18.3 Create BulkEmailDialog component (recipient preview, email preview, send confirmation)
- [x] 18.4 Add "Email Customers" button to ticket list bulk action bar (supervisor+/admin only)
- [x] 18.5 Audit log bulk email sends with sender, recipient count, ticket IDs
- [x] 18.6 Test: bulk email to 10 customers with different ticket details

## 19. Activity Timeline Filter

- [x] 19.1 Create ActivityFilter component with checkbox toggles for each event type
- [x] 19.2 Add event type classification to existing activity timeline entries
- [x] 19.3 Implement client-side filtering of timeline entries by selected event types
- [x] 19.4 Show entry count per event type in filter UI
- [x] 19.5 Persist filter state during ticket detail page session, reset on navigation away

## 20. Keyboard Shortcuts

- [x] 20.1 Create keyboard shortcuts hook (`useKeyboardShortcuts`) with global event listener
- [x] 20.2 Implement ticket list shortcuts: `j/k` navigation, `Enter` open, `e` edit, `a` assign, `x` select
- [x] 20.3 Implement ticket detail shortcuts: `r` reply, `i` internal note, `Ctrl+Enter` save, `Escape` close modal
- [x] 20.4 Implement global shortcuts: `Cmd+K`/`Ctrl+K` command palette, `?` help dialog
- [x] 20.5 Create KeyboardShortcutsHelpDialog component listing all shortcuts
- [x] 20.6 Add shortcut toggle to user profile settings (enabled by default)
- [x] 20.7 Ensure shortcuts are disabled when focused on text inputs (except `Cmd+K` and `Ctrl+Enter`)

## 21. Telephony Readiness Documentation

- [x] 21.1 Create `TELEPHONY_READINESS.md` document outlining FreeSWITCH integration prerequisites
- [x] 21.2 Document SIP trunk requirements, VPS setup, ESL library options, audio streaming pipeline
- [x] 21.3 Document existing scaffolding (TelephonyEvent types, planned endpoints, abstract interface)
- [x] 21.4 Provide deployment checklist for future telephony phase
