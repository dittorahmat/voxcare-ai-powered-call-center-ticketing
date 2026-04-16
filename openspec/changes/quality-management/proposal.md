## Why

Supervisor dan admin saat ini tidak memiliki alat terstruktur untuk menilai kualitas interaksi agent. Data mentah ada (CSAT, SLA, sentiment, ticket resolution time) tetapi tidak di-aggregate menjadi insight yang actionable. Tanpa Quality Management, tidak ada cara sistematis untuk mengidentifikasi agent yang perlu coaching, mengukur tren kualitas, atau memberikan feedback yang terdokumentasi.

## What Changes

- Add quality scorecard per ticket (supervisor rates 1-5 on multiple criteria)
- Add agent quality dashboard (avg scores, trends, areas for improvement)
- Add supervisor coaching notes (private feedback to agent)
- Add quality leaderboard (team and individual rankings)
- Extend existing CSAT + SLA + sentiment data into unified quality score
- Add ticket sampling for quality review (random + flagged tickets)

## Capabilities

### New Capabilities
- `quality-scorecard`: Per-ticket quality rating by supervisor, with multiple criteria (response accuracy, tone, resolution, professionalism) and overall score.
- `quality-dashboard`: Agent and supervisor dashboards showing quality trends, scorecards, coaching notes, and team rankings.
- `quality-coaching`: Supervisor can add private coaching notes to agents, linked to specific tickets or general feedback.

### Modified Capabilities
<!-- None — all new -->

## Impact

- **Worker types.ts**: New `QualityScorecard`, `CoachingNote` types
- **Worker app-controller.ts**: New maps and methods for scorecards, coaching notes
- **Worker userRoutes.ts**: New endpoints for CRUD scorecards, coaching, quality analytics
- **Frontend pages**: New QualityDashboard page, ScorecardDialog, CoachingDialog
- **Frontend components**: New quality score components, leaderboard table
- **Existing data**: Uses existing CSAT, SLA, sentiment, resolution time data for composite quality score
