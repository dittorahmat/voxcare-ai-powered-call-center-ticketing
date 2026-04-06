## ADDED Requirements

### Requirement: Extended keyboard shortcuts
The system SHALL support the following keyboard shortcuts across the application:

**Ticket list page:**
- `j` — Move selection down one ticket
- `k` — Move selection up one ticket
- `Enter` — Open selected ticket
- `e` — Edit selected ticket
- `a` — Open assign dialog for selected ticket
- `x` — Select/deselect current ticket

**Ticket detail page:**
- `r` — Add reply/public note
- `i` — Add internal note
- `Ctrl+Enter` — Save/submit note
- `Escape` — Close dialog/modal

**Global:**
- `Cmd+K` / `Ctrl+K` — Open command palette
- `?` — Show keyboard shortcuts help dialog

#### Scenario: Navigate ticket list with j/k
- **WHEN** a user presses `j` on the ticket list page
- **THEN** the selection moves down one ticket and highlights it

#### Scenario: Open ticket with Enter
- **WHEN** a user presses `Enter` with a ticket selected
- **THEN** they are navigated to that ticket's detail page

#### Scenario: Show keyboard shortcuts help
- **WHEN** a user presses `?`
- **THEN** a modal dialog appears showing all available keyboard shortcuts

### Requirement: Keyboard shortcuts toggle
Users SHALL enable/disable keyboard shortcuts in their profile settings. Shortcuts SHALL be enabled by default.

#### Scenario: Disable keyboard shortcuts
- **WHEN** a user toggles off keyboard shortcuts in settings
- **THEN** no keyboard shortcuts are active until re-enabled

### Requirement: Shortcuts disabled in text inputs
Keyboard shortcuts SHALL NOT trigger when the user is focused on a text input, textarea, or contentEditable element (except `Cmd+K` and `Ctrl+Enter` for form submit).

#### Scenario: Typing in textarea doesn't trigger shortcuts
- **WHEN** a user types "j" in a note textarea
- **THEN** no navigation occurs and the letter "j" is entered in the text
