## MODIFIED Requirements

### Requirement: Customer Detail Edit
The CustomerDetail page SHALL provide an "Edit" button that opens a dialog pre-filled with the customer's current data. The dialog SHALL allow editing all fields (name, email, phone, company, tags, VIP status, notes). Saving SHALL call `PATCH /api/customers/:id` and refresh the displayed customer data.

#### Scenario: Editing customer details
- **WHEN** a user clicks "Edit" on the CustomerDetail page and saves changes
- **THEN** the customer is updated via PATCH and the detail page refreshes
