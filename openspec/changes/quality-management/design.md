## Context

VoxCare already collects quality-related data:
- **CSAT**: Customer satisfaction ratings (1-5 stars) per resolved ticket
- **SLA compliance**: Whether tickets are resolved within SLA deadlines
- **Sentiment analysis**: AI-analyzed sentiment scores on customer messages
- **Resolution time**: Time from ticket creation to resolution
- **FCR**: First Contact Resolution flag

What's missing is a structured quality management layer:
- Supervisor manual scoring of ticket quality
- Coaching/feedback system
- Unified quality dashboard combining all metrics
- Ticket sampling for quality review

All data is stored in AppController DO with SQLite. Quality scorecards and coaching notes will follow the same pattern.

## Goals / Non-Goals

**Goals:**
- Supervisor can rate individual tickets on multiple quality criteria
- Agents see their own quality trends and areas for improvement
- Supervisors can add private coaching notes to agents
- Unified quality dashboard combining CSAT, SLA, sentiment, and manual scores
- Ticket sampling system for quality review

**Non-Goals:**
- AI auto-quality scoring (Phase 3 — sentiment is the start)
- Call recording review (requires telephony first)
- Peer review system
- Automated coaching recommendations
- Custom scorecard templates

## Decisions

### D1: Quality Criteria
**Decision:** Fixed 4 criteria — Accuracy, Tone, Resolution, Professionalism — plus overall score.

**Rationale:** Simple, universally understood criteria. Customizable templates add complexity without clear benefit at this scale.

```
Criteria (each 1-5):
├─ Accuracy: Correct information provided
├─ Tone: Empathetic and professional
├─ Resolution: Issue fully addressed
└─ Professionalism: Grammar, formatting, process followed

Overall: Weighted average + supervisor discretion
```

### D2: Composite Quality Score
**Decision:** Agent quality score = weighted combination of manual scorecard (40%), CSAT (30%), SLA compliance (20%), sentiment trend (10%).

**Rationale:** Balances subjective supervisor rating with objective data. Weighting prioritizes supervisor judgment while still valuing customer feedback.

```
Quality Score = (Manual × 0.4) + (CSAT × 0.3) + (SLA × 0.2) + (Sentiment × 0.1)
```

### D3: Ticket Sampling
**Decision:** Supervisor can filter tickets by agent + date range, with options: "All tickets", "Random 10%", "Flagged (low CSAT or negative sentiment)".

**Rationale:** Practical sampling that focuses review effort on tickets that matter most.

### D4: Storage
**Decision:** Store scorecards and coaching notes in AppController DO (same as other data).

**Rationale:** Consistent with existing architecture. DO SQLite handles moderate-size arrays well. No need for separate storage.

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Supervisor bias in scoring | Quality scores not objective | Composite score includes objective metrics (CSAT, SLA) |
| Scorecard fatigue | Supervisors skip reviews | Ticket sampling (not every ticket), default 10% random |
| Gaming the system | Agents cherry-pick easy tickets | Composite score includes SLA + sentiment, not just manual scores |
| DO storage growth | Large number of scorecards slows reads | Scorecards stored per ticket (not per review), moderate growth |
