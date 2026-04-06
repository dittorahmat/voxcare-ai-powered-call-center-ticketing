## ADDED Requirements

### Requirement: Embeddable chat widget
The system SHALL provide a standalone JavaScript file (`widget.js`) that customers can embed on any external website using a single script tag. The widget SHALL render a floating chat button that opens a chat panel.

#### Scenario: Widget embedding
- **WHEN** a website includes `<script src="https://voxcare.com/widget.js" data-account-id="xxx"></script>`
- **THEN** a floating chat button appears in the bottom-right corner of the page

#### Scenario: Widget CSS isolation
- **WHEN** the widget is rendered on an external website
- **THEN** the widget's styles are isolated using Shadow DOM, preventing style conflicts with the host page

### Requirement: Widget chat functionality
The embedded widget SHALL support the full chat flow: AI greeting → info collection → agent handoff → live chat → close. Anonymous customers (not logged in) SHALL be able to start a chat.

#### Scenario: Anonymous customer starts chat
- **WHEN** an unauthenticated visitor opens the widget and starts a chat
- **THEN** the AI bot greets them, collects their name and problem, and routes to an available agent

#### Scenario: Logged-in customer starts chat
- **WHEN** a customer logged into the VoxCare portal opens the widget
- **THEN** the chat is automatically associated with their customer account

### Requirement: Widget customization
The widget SHALL support basic customization via data attributes: position (bottom-left or bottom-right), primary color, and launcher button text.

#### Scenario: Widget position customization
- **WHEN** the script tag includes `data-position="bottom-left"`
- **THEN** the chat button appears in the bottom-left corner instead of bottom-right

#### Scenario: Widget color customization
- **WHEN** the script tag includes `data-color="#ff6600"`
- **THEN** the launcher button and header use the specified color

### Requirement: Portal chat page
The customer portal SHALL have a full-page chat interface at `/customer/chat` with the same functionality as the embedded widget but with persistent chat history.

#### Scenario: Customer accesses portal chat
- **WHEN** a logged-in customer navigates to `/customer/chat`
- **THEN** the system displays the full-page chat interface with access to previous chat history

#### Scenario: Chat history persistence
- **WHEN** a customer returns to `/customer/chat` after a previous session
- **THEN** the system displays their most recent active or recent chat session
