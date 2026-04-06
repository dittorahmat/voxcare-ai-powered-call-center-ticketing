## ADDED Requirements

### Requirement: Customer Data Model
The system SHALL support a `Customer` type with fields: `id`, `name`, `email`, `phone`, `company`, `tags: string[]`, `isVip: boolean`, `notes: string`, `createdAt`, `updatedAt`, `ticketCount`. Customers SHALL be stored in the AppController Durable Object with persistent storage.

#### Scenario: Customer is created with full profile
- **WHEN** a new customer is created with name, email, phone, and tags
- **THEN** the customer is stored with a unique ID and `ticketCount: 0`

#### Scenario: VIP customer flag
- **WHEN** a customer is marked as VIP
- **THEN** the `isVip` field is set to true and the customer is highlighted in search results

### Requirement: Customer CRUD API
The system SHALL expose REST endpoints for customer management:
- `GET /api/customers?page=&limit=&sort=&order=&q=` — paginated list with optional search
- `GET /api/customers/:id` — single customer detail
- `POST /api/customers` — create customer (authenticated users)
- `PATCH /api/customers/:id` — update customer (authenticated users)
- `DELETE /api/customers/:id` — delete customer (supervisor+ only)

#### Scenario: Paginated customer list
- **WHEN** a user requests `GET /api/customers?page=1&limit=20`
- **THEN** the system returns up to 20 customers with pagination metadata

#### Scenario: Customer search
- **WHEN** a user requests `GET /api/customers?q=sarah`
- **THEN** the system returns customers whose name, email, or phone matches "sarah"

### Requirement: Customer List Page
The frontend SHALL provide a `/customers` page with a paginated table showing customer name, email, phone, VIP status, ticket count, and tags. The page SHALL include a search input, create button, and sort controls.

#### Scenario: Viewing customer list
- **WHEN** a user navigates to `/customers`
- **THEN** the customer table loads with pagination controls and search

#### Scenario: Creating a new customer
- **WHEN** a user clicks "New Customer" and fills the dialog form
- **THEN** the customer is created and appears in the table

### Requirement: Customer Detail Page
The frontend SHALL provide a `/customers/:id` page showing the customer's full profile, contact information, notes, and a list of all linked tickets sorted by date.

#### Scenario: Viewing customer detail
- **WHEN** a user clicks on a customer in the list
- **THEN** the detail page shows profile info, ticket history, and notes

### Requirement: Customer-Ticket Linking
When creating or editing a ticket, users SHALL be able to link it to an existing customer by `customerId`. The ticket SHALL display the linked customer's name and profile link. Existing tickets with only `customerName` string SHALL continue to work without a customer link.

#### Scenario: Linking a ticket to a customer
- **WHEN** a user creates a ticket and selects an existing customer
- **THEN** the ticket's `customerId` is set and the customer name is auto-populated

#### Scenario: Ticket without customer link
- **WHEN** a ticket has no `customerId` but has `customerName`
- **THEN** the ticket displays normally with the customer name string
