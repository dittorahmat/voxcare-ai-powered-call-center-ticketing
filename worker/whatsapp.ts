/**
 * WhatsApp integration via WAHA (self-hosted WhatsApp HTTP API).
 * Handles incoming webhooks, outgoing messages, and session management.
 */

import type { Env } from './core-utils';
import { getAppController } from './core-utils';

/**
 * Normalize phone number for matching: strip +, spaces, dashes, parentheses.
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)\+]/g, '');
}

/**
 * Find customer by phone number (tries exact match first, then normalized).
 */
export async function findCustomerByPhone(
  controller: ReturnType<typeof getAppController>,
  phone: string
): Promise<any> {
  const customers = await controller.listCustomers();
  const normalized = normalizePhone(phone);

  // Try exact match first
  let customer = customers.find(c => c.phone === phone);
  if (customer) return customer;

  // Try normalized match
  customer = customers.find(c => c.phone && normalizePhone(c.phone) === normalized);
  return customer || null;
}

/**
 * Find latest open ticket for a customer.
 */
export async function findLatestOpenTicket(
  controller: ReturnType<typeof getAppController>,
  customerId: string
): Promise<any> {
  const tickets = await controller.listTickets();
  return tickets.find(t =>
    t.customerId === customerId &&
    ['open', 'in-progress', 'reopened'].includes(t.status)
  ) || null;
}

/**
 * Send WhatsApp message via WAHA API.
 */
export async function sendWhatsAppMessage(
  phone: string,
  text: string,
  env: Env
): Promise<boolean> {
  const wahaUrl = env.WAHA_URL;
  const wahaKey = env.WAHA_API_KEY;

  if (!wahaUrl || !wahaKey) {
    console.warn('[WhatsApp] WAHA not configured. Message not sent:', text);
    return false;
  }

  try {
    const res = await fetch(`${wahaUrl}/api/sendText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': wahaKey,
      },
      body: JSON.stringify({
        chatId: `${phone}@c.us`,
        text,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[WhatsApp] WAHA API error ${res.status}: ${errText}`);
      return false;
    }

    console.log(`[WhatsApp] Sent to ${phone}: ${text.substring(0, 50)}...`);
    return true;
  } catch (error) {
    console.error('[WhatsApp] sendWhatsAppMessage error:', error);
    return false;
  }
}

/**
 * Check WAHA session status.
 */
export async function getWAHAStatus(env: Env): Promise<{ connected: boolean; session?: string; error?: string }> {
  const wahaUrl = env.WAHA_URL;
  const wahaKey = env.WAHA_API_KEY;

  if (!wahaUrl || !wahaKey) {
    return { connected: false, error: 'WAHA not configured' };
  }

  try {
    const res = await fetch(`${wahaUrl}/api/sessions`, {
      headers: { 'X-Api-Key': wahaKey },
    });

    if (!res.ok) {
      return { connected: false, error: `WAHA API returned ${res.status}` };
    }

    const sessions: any[] = await res.json();
    const activeSession = sessions.find((s: any) => s.state === 'WORKING');

    if (activeSession) {
      return { connected: true, session: activeSession.name };
    }

    return { connected: false, error: 'No active WAHA session. Scan QR code.' };
  } catch (error) {
    return { connected: false, error: `WAHA unreachable: ${error}` };
  }
}
