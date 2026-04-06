## ADDED Requirements

### Requirement: Global Search API
The system SHALL expose `GET /api/search?q=&type=ticket,customer,call&limit=10` that searches across tickets, customers, and calls. Results SHALL be returned as a unified array with each result including: `type`, `id`, `title` (or name), `subtitle` (context), `relevanceScore`, and a `url` for navigation.

#### Scenario: Searching across all types
- **WHEN** a user requests `GET /api/search?q=sarah`
- **THEN** the system returns matching tickets, customers, and calls ranked by relevance

#### Scenario: Searching specific type only
- **WHEN** a user requests `GET /api/search?q=network&type=ticket`
- **THEN** only tickets matching "network" are returned

### Requirement: Header Search Implementation
The search input in the MainLayout header SHALL be functional: it SHALL debounce input by 300ms, call the global search API, and display results in a dropdown panel. Pressing Enter SHALL navigate to the first result or to a full search results page if multiple types match.

#### Scenario: Typing in header search
- **WHEN** a user types "billing" in the header search
- **THEN** after 300ms, a dropdown shows matching results from tickets, customers, and calls

#### Scenario: Pressing Enter on search
- **WHEN** a user presses Enter after typing "T-1001"
- **THEN** the user is navigated to the ticket detail page for T-1001

### Requirement: Command Palette (Cmd+K)
The frontend SHALL provide a command palette triggered by `Cmd+K` (Mac) or `Ctrl+K` (Windows). The command palette SHALL use the shadcn Command component, support text search via the global search API, display results grouped by type (Tickets, Customers, Calls, Navigation), and allow keyboard navigation with arrow keys and Enter.

#### Scenario: Opening command palette
- **WHEN** a user presses Cmd+K
- **THEN** a modal command palette opens with a search input

#### Scenario: Navigating command palette with keyboard
- **WHEN** a user types "ticket" and presses arrow down then Enter
- **THEN** the user is navigated to the selected result

#### Scenario: Command palette navigation shortcuts
- **WHEN** the command palette is open
- **THEN** pressing Escape closes it, and typing filters results in real-time
