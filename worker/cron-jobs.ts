import { getAppController } from './core-utils';
import { Env } from './core-utils';
import { sendEmail, createTicketResolvedEmail } from './email-service';

/**
 * Generate PDF by POSTing HTML to Cloudflare Browser Rendering API.
 * Returns the PDF blob, or null if the API is unavailable.
 */
export async function generatePDFViaBrowserRendering(
  html: string,
  env: Env
): Promise<ArrayBuffer | null> {
  const apiUrl = env.BROWSER_RENDERING_API_URL;
  const apiKey = env.BROWSER_RENDERING_API_KEY;
  if (!apiUrl || !apiKey) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    // The Browser Rendering API accepts HTML and returns a PDF
    const response = await fetch(`${apiUrl}/pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url: `data:text/html;charset=utf-8,${encodeURIComponent(html)}`,
        waitUntil: 'networkidle0',
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Browser Rendering API returned ${response.status}: ${response.statusText}`);
    }

    return await response.arrayBuffer();
  } catch (error) {
    console.error('[PDF] Browser Rendering API error:', error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function runAutoCloseEvaluation(env: Env): Promise<{ closedCount: number }> {
  const controller = getAppController(env);
  const rules = await controller.listAutoCloseRules();
  const tickets = await controller.listTickets();
  const enabledRules = rules.filter(r => r.enabled);
  let closedCount = 0;

  for (const rule of enabledRules) {
    for (const ticket of tickets) {
      if (ticket.status === 'merged' || ticket.status === 'closed') continue;
      if (rule.condition.status && ticket.status !== rule.condition.status) continue;
      if (rule.condition.daysSinceUpdate !== undefined) {
        const updatedAt = ticket.updatedAt ? new Date(ticket.updatedAt) : new Date(ticket.createdAt);
        const daysSince = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < rule.condition.daysSinceUpdate) continue;
      }
      if (rule.condition.daysSinceCustomerReply !== undefined) {
        if (!ticket.lastCustomerReplyAt) continue;
        const daysSince = (Date.now() - new Date(ticket.lastCustomerReplyAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < rule.condition.daysSinceCustomerReply) continue;
      }
      await controller.updateTicket(ticket.id, {
        status: rule.action.setStatus,
        internalNotes: [...(ticket.internalNotes || []), {
          text: rule.action.addInternalNote || `[Auto-Close] Ticket automatically ${rule.action.setStatus} by rule: ${rule.name}`,
          authorId: 'system',
          authorName: 'System',
          timestamp: new Date().toISOString(),
        }],
        updatedAt: new Date().toISOString(),
      });
      await controller.appendAuditLog({
        action: 'auto-closed', userId: 'system', userName: 'System', userRole: 'system',
        entityType: 'ticket', entityId: ticket.id, timestamp: new Date().toISOString(),
        changes: { data: { after: { rule: rule.name, newStatus: rule.action.setStatus } } },
      });
      closedCount++;
    }
  }
  return { closedCount };
}

export async function runCSATReminders(env: Env): Promise<{ remindersSent: number }> {
  const controller = getAppController(env);
  const tickets = await controller.listTickets();
  const csatResponses = await controller.listCSATResponses();
  const now = Date.now();
  const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
  const fortyEightHoursAgo = now - 48 * 60 * 60 * 1000;
  let remindersSent = 0;

  const resolvedTickets = tickets.filter(t => t.status === 'resolved' && t.resolvedAt);
  for (const ticket of resolvedTickets) {
    const resolvedAt = new Date(ticket.resolvedAt).getTime();
    if (resolvedAt < fortyEightHoursAgo || resolvedAt > twentyFourHoursAgo) continue;
    if (csatResponses.some(c => c.ticketId === ticket.id)) continue;
    if (!ticket.customerId) continue;

    const customer = await controller.getCustomer(ticket.customerId);
    if (!customer?.email) continue;

    const appUrl = env.APP_URL || 'http://localhost:5173';
    const ticketUrl = `${appUrl}/public/ticket/${ticket.publicToken}`;
    const email = createTicketResolvedEmail(customer.email, customer.name, ticket.id, ticket.title, '', ticketUrl, ticketUrl);
    await sendEmail(email, env);
    remindersSent++;
  }
  return { remindersSent };
}

export async function runCSATCleanup(env: Env): Promise<{ deletedCount: number }> {
  const controller = getAppController(env);
  const csatResponses = await controller.listCSATResponses();
  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
  let deletedCount = 0;

  for (const response of csatResponses) {
    const submittedAt = new Date(response.submittedAt).getTime();
    if (submittedAt < ninetyDaysAgo) {
      await controller.deleteCSATResponse(response.id);
      deletedCount++;
    }
  }
  return { deletedCount };
}

export function calculateNextRunAt(
  frequency: 'daily' | 'weekly',
  time: string,
  dayOfWeek?: number
): string {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  const scheduled = new Date(now);
  scheduled.setHours(hours, minutes, 0, 0);

  if (frequency === 'daily') {
    if (scheduled <= now) {
      scheduled.setDate(scheduled.getDate() + 1);
    }
    return scheduled.toISOString();
  }

  // Weekly: find next occurrence of dayOfWeek
  if (dayOfWeek !== undefined) {
    const currentDay = now.getDay();
    let daysUntilTarget = dayOfWeek - currentDay;
    if (daysUntilTarget <= 0) {
      daysUntilTarget += 7;
      if (scheduled <= now) {
        daysUntilTarget += 7;
      }
    } else if (scheduled <= now) {
      daysUntilTarget += 7;
    }
    scheduled.setDate(scheduled.getDate() + daysUntilTarget);
  }

  return scheduled.toISOString();
}

export async function runScheduledReportDelivery(env: Env): Promise<{ delivered: number; skipped: number; failed: number }> {
  const controller = getAppController(env);
  const reports = await controller.listScheduledReports();
  const now = Date.now();
  let delivered = 0;
  let skipped = 0;
  let failed = 0;

  for (const report of reports) {
    if (!report.enabled) { skipped++; continue; }
    if (!report.nextRunAt) {
      // First run: calculate nextRunAt
      const nextRunAt = calculateNextRunAt(report.schedule.frequency, report.schedule.time, report.schedule.dayOfWeek);
      await controller.updateScheduledReport(report.id, { nextRunAt });
      skipped++;
      continue;
    }
    if (new Date(report.nextRunAt).getTime() > now) { skipped++; continue; }

    try {
      await deliverReport(env, report);
      const nextRunAt = calculateNextRunAt(report.schedule.frequency, report.schedule.time, report.schedule.dayOfWeek);
      await controller.updateScheduledReport(report.id, {
        lastRunAt: new Date().toISOString(),
        nextRunAt,
      });
      delivered++;
    } catch (error) {
      console.error(`[Cron] Report ${report.id} failed:`, error);
      failed++;
      // Don't update lastRunAt so it retries next cycle
    }
  }
  return { delivered, skipped, failed };
}

async function deliverReport(env: Env, report: any): Promise<void> {
  const controller = getAppController(env);
  const tickets = await controller.listTickets();
  const slaRecords = await controller.listSLARecords();
  const users = await controller.listUsers();

  // Filter tickets by date range
  let dateFrom: Date, dateTo: Date;
  const now = new Date();
  switch (report.dateRange) {
    case 'yesterday':
      dateFrom = new Date(now); dateFrom.setDate(dateFrom.getDate() - 1); dateFrom.setHours(0, 0, 0, 0);
      dateTo = new Date(now); dateTo.setHours(0, 0, 0, 0);
      break;
    case 'last-7-days':
      dateFrom = new Date(now); dateFrom.setDate(dateFrom.getDate() - 7);
      dateTo = now;
      break;
    default: // last-30-days
      dateFrom = new Date(now); dateFrom.setDate(dateFrom.getDate() - 30);
      dateTo = now;
  }

  const filteredTickets = tickets.filter(t => {
    const createdAt = new Date(t.createdAt);
    return createdAt >= dateFrom && createdAt <= dateTo;
  });

  const resolved = filteredTickets.filter(t => t.status === 'resolved');
  const slaCompliant = filteredTickets.filter(t => {
    if (!t.slaRecordId) return true;
    const sla = slaRecords.find(s => s.id === t.slaRecordId);
    return sla && !sla.breached;
  });
  const slaRate = filteredTickets.length > 0 ? Math.round((slaCompliant.length / filteredTickets.length) * 100) : 100;

  const reportLabels: Record<string, string> = {
    'daily-summary': 'Daily Summary',
    'weekly-sla': 'Weekly SLA Compliance',
    'weekly-agent-performance': 'Weekly Agent Performance',
  };

  const dateRangeLabels: Record<string, string> = {
    'yesterday': 'Yesterday',
    'last-7-days': 'Last 7 Days',
    'last-30-days': 'Last 30 Days',
  };

  const appUrl = env.APP_URL || 'http://localhost:5173';

  let tableRows = filteredTickets.slice(0, 20).map(t =>
    `<tr><td>${t.id}</td><td>${t.title}</td><td>${t.priority}</td><td>${t.status}</td><td>${new Date(t.createdAt).toLocaleDateString()}</td></tr>`
  ).join('');

  if (filteredTickets.length > 20) {
    tableRows += `<tr><td colspan="5">... and ${filteredTickets.length - 20} more tickets</td></tr>`;
  }

  const htmlBody = `
    <html><body style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>VoxCare ${reportLabels[report.type] || report.type}</h2>
      <p><strong>Date Range:</strong> ${dateRangeLabels[report.dateRange] || report.dateRange}</p>
      <p><strong>Generated:</strong> ${new Date().toISOString()}</p>
      <hr/>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
        <tr style="background: #f3f4f6;"><th>ID</th><th>Title</th><th>Priority</th><th>Status</th><th>Created</th></tr>
        ${tableRows}
      </table>
      <hr/>
      <p><strong>Total Tickets:</strong> ${filteredTickets.length} | <strong>Resolved:</strong> ${resolved.length} | <strong>SLA Compliance:</strong> ${slaRate}%</p>
      <p><a href="${appUrl}" style="color: #6366f1;">View in Dashboard →</a></p>
      <p style="color: #6b7280; font-size: 12px;">This is an automated report from VoxCare.</p>
    </body></html>
  `;

  const subject = `VoxCare ${reportLabels[report.type] || report.type} — ${dateRangeLabels[report.dateRange] || report.dateRange}`;

  const emails = report.recipients || [];
  for (const email of emails) {
    await sendEmail({
      to: email,
      subject,
      htmlBody,
      textBody: `VoxCare ${report.type} report. Total: ${filteredTickets.length}, Resolved: ${resolved.length}, SLA: ${slaRate}%. View at ${appUrl}`,
    }, env);
  }
}
