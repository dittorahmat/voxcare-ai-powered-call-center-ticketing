/**
 * Email service using SendGrid Transactional API.
 * Automatically disabled if SENDGRID_API_KEY is not configured.
 */

export interface EmailOptions {
  to: string;
  toName?: string;
  from?: string;
  fromName?: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: { content: string; filename: string; type: string }[];
}

/**
 * Send an email via SendGrid. Falls back to console.log if API key not configured.
 */
export async function sendEmail(options: EmailOptions, env?: { SENDGRID_API_KEY?: string; EMAIL_FROM?: string; EMAIL_FROM_NAME?: string; APP_URL?: string }): Promise<boolean> {
  const apiKey = env?.SENDGRID_API_KEY;
  if (!apiKey) {
    console.log(`[EMAIL] Would send to ${options.to}: ${options.subject}`);
    return false;
  }

  const from = options.from || env?.EMAIL_FROM || 'noreply@voxcare.com';
  const fromName = options.fromName || env?.EMAIL_FROM_NAME || 'VoxCare';

  try {
    const body: Record<string, unknown> = {
      personalizations: [{
        to: [{ email: options.to, name: options.toName || options.to }],
      }],
      from: { email: from, name: fromName },
      subject: options.subject,
      content: [
        { type: 'text/html', value: options.html },
        ...(options.text ? [{ type: 'text/plain', value: options.text }] : []),
      ],
    };

    if (options.attachments?.length) {
      body.attachments = options.attachments;
    }

    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[EMAIL] SendGrid error ${res.status}: ${errText}`);
      return false;
    }

    console.log(`[EMAIL] Sent to ${options.to}: ${options.subject}`);
    return true;
  } catch (err) {
    console.error(`[EMAIL] SendGrid error: ${err}`);
    return false;
  }
}

export function createTicketCreatedEmail(customerEmail: string, customerName: string, ticketId: string, title: string, description: string, ticketUrl: string): EmailOptions {
  return {
    to: customerEmail,
    toName: customerName,
    subject: `Ticket ${ticketId} Created: ${title}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;">
        <h2 style="color:#2563eb;">Ticket Created</h2>
        <p>Dear ${customerName},</p>
        <p>Your ticket has been created successfully.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;"><strong>Ticket ID:</strong></td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${ticketId}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;"><strong>Subject:</strong></td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${title}</td></tr>
        </table>
        <p><strong>Description:</strong> ${description}</p>
        <p>Our team will review your request shortly.</p>
        <a href="${ticketUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;margin-top:16px;">View Ticket</a>
      </div>
    `,
    text: `Ticket ${ticketId} created: ${title}\n\nView: ${ticketUrl}`,
  };
}

export function createTicketUpdatedEmail(customerEmail: string, customerName: string, ticketId: string, title: string, publicNote: string, ticketUrl: string): EmailOptions {
  return {
    to: customerEmail,
    toName: customerName,
    subject: `Ticket ${ticketId} Updated: ${title}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;">
        <h2 style="color:#2563eb;">Ticket Updated</h2>
        <p>Dear ${customerName},</p>
        <p>Your ticket has been updated.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;"><strong>Ticket ID:</strong></td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${ticketId}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;"><strong>Subject:</strong></td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${title}</td></tr>
        </table>
        ${publicNote ? `<p><strong>Note:</strong> ${publicNote}</p>` : ''}
        <a href="${ticketUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;margin-top:16px;">View Ticket</a>
      </div>
    `,
    text: `Ticket ${ticketId} updated: ${title}\n\n${publicNote || ''}\n\nView: ${ticketUrl}`,
  };
}

export function createTicketResolvedEmail(customerEmail: string, customerName: string, ticketId: string, title: string, resolutionNotes: string, ticketUrl: string, csatUrl?: string): EmailOptions {
  return {
    to: customerEmail,
    toName: customerName,
    subject: `Ticket ${ticketId} Resolved: ${title}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;">
        <h2 style="color:#16a34a;">Ticket Resolved</h2>
        <p>Dear ${customerName},</p>
        <p>Your ticket has been resolved.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;"><strong>Ticket ID:</strong></td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${ticketId}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;"><strong>Subject:</strong></td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${title}</td></tr>
        </table>
        ${resolutionNotes ? `<p><strong>Resolution Notes:</strong> ${resolutionNotes}</p>` : ''}
        <a href="${ticketUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;margin-top:16px;">View Ticket</a>
        ${csatUrl ? `<p style="margin-top:24px;">How did we do? <a href="${csatUrl}">Rate your experience</a></p>` : ''}
      </div>
    `,
    text: `Ticket ${ticketId} resolved: ${title}\n\n${resolutionNotes || ''}\n\nView: ${ticketUrl}${csatUrl ? `\nRate us: ${csatUrl}` : ''}`,
  };
}

export function createTicketAssignedEmail(agentEmail: string, agentName: string, ticketId: string, title: string, ticketUrl: string): EmailOptions {
  return {
    to: agentEmail,
    toName: agentName,
    subject: `New Ticket Assigned: ${ticketId}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;">
        <h2 style="color:#2563eb;">New Ticket Assigned</h2>
        <p>Hello ${agentName},</p>
        <p>A new ticket has been assigned to you.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;"><strong>Ticket ID:</strong></td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${ticketId}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;"><strong>Title:</strong></td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${title}</td></tr>
        </table>
        <a href="${ticketUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;margin-top:16px;">View Ticket</a>
      </div>
    `,
    text: `Ticket ${ticketId} assigned to you: ${title}\n\nView: ${ticketUrl}`,
  };
}

export function createPasswordResetEmail(userEmail: string, resetUrl: string): EmailOptions {
  return {
    to: userEmail,
    subject: 'VoxCare - Password Reset Request',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;">
        <h2 style="color:#2563eb;">Password Reset</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;margin-top:16px;">Reset Password</a>
        <p style="margin-top:16px;">This link expires in 1 hour.</p>
      </div>
    `,
    text: `Reset your password: ${resetUrl}`,
  };
}

export function createSLABreachEmail(supervisorEmail: string, ticketId: string, title: string, priority: string, ticketUrl: string): EmailOptions {
  return {
    to: supervisorEmail,
    subject: `SLA Breach Alert: Ticket ${ticketId}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;">
        <h2 style="color:#dc2626;">SLA Breach Alert</h2>
        <p>A ticket has breached its SLA deadline.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;"><strong>Ticket ID:</strong></td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${ticketId}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;"><strong>Title:</strong></td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${title}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;"><strong>Priority:</strong></td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${priority}</td></tr>
        </table>
        <a href="${ticketUrl}" style="display:inline-block;padding:12px 24px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px;margin-top:16px;">View Ticket</a>
      </div>
    `,
    text: `SLA Breach: Ticket ${ticketId} (${priority}) - ${title}\n\nView: ${ticketUrl}`,
  };
}

/**
 * Substitute template variables in a string.
 * Supports: {{customer_name}}, {{ticket_id}}, {{ticket_title}}, {{ticket_status}}, {{ticket_url}}, {{agent_name}}, {{resolution_notes}}
 */
export function substituteTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    return vars[key] !== undefined ? vars[key] : `{{${key}}}`;
  });
}
