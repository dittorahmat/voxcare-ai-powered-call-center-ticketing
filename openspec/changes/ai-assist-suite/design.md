## Context

VoxCare already has AI infrastructure: Cloudflare AI Gateway with Gemini models, tool-calling architecture via `worker/tools.ts`, and `SystemSettings.aiConfig` for model/temperature/maxTokens configuration. The existing `getToolDefinitions()` and `executeTool()` functions support adding new tools. This change extends that architecture with three new AI tools called programmatically (not via chat bot).

## Goals / Non-Goals

**Goals:**
- Auto-categorize new tickets using AI (suggestion only, agent can override)
- Provide on-demand AI response suggestions for agents
- Analyze sentiment on every customer message
- Flag negative sentiment to alert agents
- Surface sentiment trends in analytics

**Non-Goals:**
- No auto-escalation based on sentiment (flag only, Phase 3)
- No AI auto-resolution of tickets
- No multi-language AI support beyond system locale
- No AI training/fine-tuning (uses off-the-shelf Gemini)

## Decisions

### D1: AI Tools Architecture
**Decision:** Add three new tools to existing `worker/tools.ts`: `auto_categorize_ticket`, `analyze_sentiment`, `suggest_response`. Called programmatically by worker code, not via chat bot.

**Rationale:** Reuses existing AI client, tool execution pattern, and Cloudflare AI Gateway. Centralized in one file for maintainability.

### D2: Async Non-Blocking Execution
**Decision:** Auto-categorize and sentiment analysis run async (fire-and-forget). They do NOT block ticket creation or reply processing.

**Rationale:** AI calls add 1-3 seconds latency. Blocking would degrade user experience. Results are stored when available.

### D3: AI Suggestion UX
**Decision:** AI response suggestions shown in a SEPARATE panel with "Use" and "Dismiss" buttons. NOT auto-inserted into reply editor.

**Rationale:** Maintains agent control. Prevents accidental AI responses being sent. Agent must explicitly accept.

### D4: Sentiment Escalation
**Decision:** Phase 2 = flag/warn only. Negative sentiment (score < -0.5) shows red flag on ticket. NO automatic priority change.

**Rationale:** Auto-escalation requires careful tuning. Phase 3 workflow automation builder will handle this.

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI auto-categorization accuracy may be low initially | Wrong category suggestions | Mark as "suggested" only. Agent can override. Track accuracy over time. |
| Sentiment analysis adds async load | Minor DO write overhead | Fire-and-forget. Stored when complete. No blocking. |
| AI suggestion cost per request | Increased AI Gateway costs | 20 req/min rate limit per agent. Monitor usage via observability. |
| AI suggestions may be inappropriate for complex tickets | Agent frustration or wrong responses | Tool uses full ticket context. Agent reviews before use. |
