## ADDED Requirements

### Requirement: API Rate Limiting
The system SHALL enforce rate limits per IP address using a sliding window counter stored in a Durable Object. Limits: 100 requests/minute for general API endpoints, 10 requests/minute for authentication endpoints (`/api/auth/*`). When limit is exceeded, the system SHALL return HTTP 429 with `Retry-After` header. Rate limit state SHALL be reset every 60 seconds.

#### Scenario: General API rate limit exceeded
- **WHEN** an IP sends more than 100 requests in 1 minute to `/api/tickets`
- **THEN** subsequent requests return 429 with `Retry-After: 60`

#### Scenario: Auth endpoint rate limit exceeded
- **WHEN** an IP sends more than 10 login attempts in 1 minute
- **THEN** subsequent attempts return 429, preventing brute-force attacks
