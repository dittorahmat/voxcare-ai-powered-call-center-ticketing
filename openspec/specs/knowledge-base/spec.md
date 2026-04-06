# knowledge-base Specification

## Purpose
TBD - created by archiving change phase1-2-customer-ops-excellence. Update Purpose after archive.
## Requirements
### Requirement: Admin can create knowledge base articles
The system SHALL allow admins to create knowledge base articles with title, content (HTML/Markdown), category, tags, and published status via `POST /api/knowledge-base/articles`. All articles SHALL be in Bahasa Indonesia.

#### Scenario: Admin creates published article
- **WHEN** admin POSTs `{ title: "How to Reset Password", content: "...", category: "Account", tags: ["password", "login"], published: true }`
- **THEN** the article is stored in the knowledge base KV with a unique ID and is immediately visible to the public

#### Scenario: Admin creates draft article
- **WHEN** admin POSTs with `published: false`
- **THEN** the article is stored but is NOT visible in public search or listing

### Requirement: Admin can update and delete knowledge base articles
The system SHALL provide `PUT /api/knowledge-base/articles/:id` and `DELETE /api/knowledge-base/articles/:id` endpoints restricted to admin role.

#### Scenario: Admin updates article
- **WHEN** admin PUTs updated fields to `/api/knowledge-base/articles/:id`
- **THEN** the article is updated and the KV entry is refreshed

#### Scenario: Admin deletes article
- **WHEN** admin DELETEs `/api/knowledge-base/articles/:id`
- **THEN** the article is removed from KV and the search index is updated

### Requirement: Public can list published articles
The system SHALL provide `GET /api/knowledge-base/articles` that returns only published articles, supporting optional `category` and `tag` query filters.

#### Scenario: Public lists all published articles
- **WHEN** anyone GETs `/api/knowledge-base/articles`
- **THEN** only articles with `published: true` are returned

#### Scenario: Filter by category
- **WHEN** user GETs `/api/knowledge-base/articles?category=Account`
- **THEN** only published articles in the "Account" category are returned

### Requirement: Public can search knowledge base articles
The system SHALL provide full-text search over knowledge base article titles, content, and tags via `GET /api/knowledge-base/articles?search=query`.

#### Scenario: User searches for articles
- **WHEN** user GETs `/api/knowledge-base/articles?search=password+reset`
- **THEN** articles matching "password" or "reset" in title, content, or tags are returned, ranked by relevance

### Requirement: Public can view a single article
The system SHALL provide `GET /api/knowledge-base/articles/:id` that returns the full article content for published articles. Draft articles SHALL return 404 to non-admin users.

#### Scenario: Public views published article
- **WHEN** anyone GETs `/api/knowledge-base/articles/{published-id}`
- **THEN** the full article (title, content, category, tags, updatedAt) is returned

#### Scenario: Non-admin requests draft article
- **WHEN** non-admin user GETs `/api/knowledge-base/articles/{draft-id}`
- **THEN** the system returns 404 Not Found

### Requirement: Customers can rate article helpfulness
The system SHALL allow any user to submit feedback on a knowledge base article via `POST /api/knowledge-base/articles/:id/feedback` with `{ helpful: true | false }`.

#### Scenario: Customer marks article helpful
- **WHEN** user POSTs `{ helpful: true }` to an article's feedback endpoint
- **THEN** the article's `helpfulCount` is incremented

#### Scenario: Customer marks article not helpful
- **WHEN** user POSTs `{ helpful: false }`
- **THEN** the article's `notHelpfulCount` is incremented

### Requirement: AI suggests articles during ticket creation
When a customer creates a ticket, the system SHALL search knowledge base articles matching the ticket title and description, and return suggested articles via the ticket creation response.

#### Scenario: AI suggests relevant articles
- **WHEN** customer POSTs a new ticket with `{ title: "Cannot login to my account", ... }`
- **THEN** the response includes a `suggestedArticles` array with matching KB articles (e.g., "How to Reset Password", "Account Lockout Policy")

### Requirement: Knowledge base stored in KV
Knowledge base articles SHALL be stored in a dedicated KV namespace (`KNOWLEDGE_BASE_KV`) using the key pattern `kb:articles:{id}`. A `kb:index` key SHALL store the article metadata array for search.

#### Scenario: Article stored and indexed
- **WHEN** admin creates an article
- **THEN** the article content is stored at `kb:articles:{id}` and the metadata (id, title, category, tags, published) is added to `kb:index`

### Requirement: Knowledge base admin UI
The system SHALL provide an admin settings page (`/settings/knowledge-base`) for creating, editing, and deleting knowledge base articles with a rich text editor, category selector, tag input, and publish toggle.

#### Scenario: Admin manages articles
- **WHEN** admin visits `/settings/knowledge-base`
- **THEN** they see a list of all articles (published and draft), can create new ones, edit existing ones, and toggle publish status

### Requirement: Public knowledge base pages
The system SHALL provide public-facing pages at `/kb` (article listing with search) and `/kb/:id` (article detail view) that do not require authentication.

#### Scenario: Public browses knowledge base
- **WHEN** visitor opens `/kb`
- **THEN** they see a search bar, category filters, and a list of published articles

#### Scenario: Public reads an article
- **WHEN** visitor clicks an article from `/kb`
- **THEN** they are taken to `/kb/:id` showing the full article content with helpful/not helpful buttons

