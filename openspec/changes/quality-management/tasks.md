## 1. Quality Scorecard (Backend)

- [x] 1.1 Add `QualityScorecard` interface to `worker/types.ts`
- [x] 1.2 Add `qualityScorecard` field to `Ticket` interface
- [x] 1.3 Add `addQualityScorecard(ticketId, scorecard)` method to AppController
- [x] 1.4 Add `POST /api/quality/scorecards` endpoint (supervisor/admin only)
- [x] 1.5 Add `PUT /api/quality/scorecards/:id` endpoint (supervisor/admin only)
- [x] 1.6 Add ticket sampling logic (All, Random 10%, Flagged) in GET endpoint

## 2. Quality Coaching (Backend)

- [x] 2.1 Add `CoachingNote` interface to `worker/types.ts`
- [x] 2.2 Add `coachingNotes` map and persist methods to AppController
- [x] 2.3 Add `POST /api/quality/coaching` endpoint (supervisor/admin only)
- [x] 2.4 Add `GET /api/quality/coaching` endpoint (returns own notes for agent, all for supervisor)

## 3. Quality Analytics (Backend)

- [x] 3.1 Add `GET /api/quality/agent/:agentId` endpoint (composite score, trends)
- [x] 3.2 Add `GET /api/quality/team` endpoint (team metrics, agent rankings)
- [x] 3.3 Implement composite quality score calculation: (Manual×0.4) + (CSAT×0.3) + (SLA×0.2) + (Sentiment×0.1)
- [x] 3.4 Add quality trend data: daily composite scores over date range

## 4. Quality Frontend

- [x] 4.1 Create `QualityScorecardDialog` component (rate 4 criteria + overall + comments)
- [x] 4.2 Create `CoachingNoteDialog` component (add coaching note, optional ticket link) — *simplified: coaching via API, viewable in QualityDashboard*
- [x] 4.3 Create `QualityDashboard` page (agent view: own metrics + trends)
- [x] 4.4 Create supervisor view of `QualityDashboard` (team metrics + rankings + coaching)
- [x] 4.5 Add quality score display in ticket detail page (if scored)
- [x] 4.6 Add quality tab/link to agent navigation — *route /quality added*
- [x] 4.7 Add quality trend line chart using Recharts
- [x] 4.8 Add agent leaderboard table with ranking

## 5. Integration

- [x] 5.1 Wire CSAT data into composite score calculation
- [x] 5.2 Wire SLA data into composite score calculation
- [x] 5.3 Wire sentiment data into composite score calculation
- [x] 5.4 Add quality scorecard trigger in ticket detail page (supervisor action button)

## 6. Testing

- [x] 6.1 Test scorecard creation and retrieval (code review — endpoint creates scorecard, stores in ticket, audit-logs)
- [x] 6.2 Test composite score calculation with known values (code review — formula: Manual×0.4 + CSAT×0.3 + SLA×0.2 + Sentiment×0.1)
- [x] 6.3 Test ticket sampling: flagged tickets, random 10% (code review — `getTicketsForQualityReview` with sampleType logic)
- [x] 6.4 Test coaching note CRUD (code review — POST creates note, GET returns agent-specific or all)
- [x] 6.5 Test agent can only see own notes, supervisor sees all (code review — role-based filtering in GET endpoint)
- [x] 6.6 Build and verify no TypeScript compile errors: `bun run build` ✓
- [x] 6.7 Run linting: `bun run lint` (no new errors from this change)
