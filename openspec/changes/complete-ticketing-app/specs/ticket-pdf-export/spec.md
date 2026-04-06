## ADDED Requirements

### Requirement: Export individual ticket as PDF
Agents SHALL export a single ticket as a PDF document from the ticket detail page. The PDF SHALL include: ticket metadata (title, status, priority, category, assignee, dates), full transcript, internal notes (if the exporting user has permission), public notes, attachment list, and activity timeline.

#### Scenario: Agent exports ticket PDF
- **WHEN** an agent clicks "Export PDF" on a ticket detail page
- **THEN** a PDF is generated and downloaded with all ticket information formatted in a clean, readable layout

#### Scenario: Internal notes included for agents
- **WHEN** an agent exports a ticket PDF
- **THEN** internal notes are included in the PDF (visible only to internal users)

### Requirement: PDF includes branding
The PDF SHALL include the company name and logo from system settings, displayed in the header. Colors SHALL match the system theme.

#### Scenario: Branded PDF header
- **WHEN** a ticket PDF is generated
- **THEN** the header shows the company name and logo configured in system settings

### Requirement: Email ticket PDF to customer
From the ticket detail page, agents SHALL send the PDF export to the customer's email address with a configurable message body.

#### Scenario: Email PDF to customer
- **WHEN** an agent clicks "Send PDF to Customer" and enters an optional message
- **THEN** the PDF is attached to an email and sent to the customer's email address via SendGrid

### Requirement: Print-friendly ticket view
The ticket detail page SHALL have a print-friendly CSS layout that hides navigation, sidebar, and interactive elements when printing via browser print dialog.

#### Scenario: Print ticket page
- **WHEN** an agent presses Ctrl+P on the ticket detail page
- **THEN** the printed output shows only the ticket content in a clean, readable format
