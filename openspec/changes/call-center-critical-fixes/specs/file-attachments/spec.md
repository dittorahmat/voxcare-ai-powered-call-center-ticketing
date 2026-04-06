## ADDED Requirements

### Requirement: File Upload to Tickets
Authenticated users SHALL upload files (images, PDFs, documents) to tickets via a file upload component. Files SHALL be stored in Cloudflare R2 with metadata (filename, size, contentType, r2Key, uploadedAt) stored in the ticket's `attachments` array. Maximum file size: 10MB. Supported types: images (jpg, png, gif, webp), PDFs, text files.

#### Scenario: Agent attaches file to ticket
- **WHEN** an agent uploads a 2MB PNG screenshot to a ticket
- **THEN** the file is stored in R2 and displayed in the ticket's attachments list

### Requirement: File Download and Preview
Users SHALL download attachments from the ticket detail page. Image files SHALL display inline previews. Non-image files SHALL show a download link with file size.

#### Scenario: Preview attached image
- **WHEN** a user views a ticket with an attached JPEG image
- **THEN** the image is displayed as an inline preview with a download button
