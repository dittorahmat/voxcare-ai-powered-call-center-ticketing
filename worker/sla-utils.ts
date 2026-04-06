/**
 * Business hours SLA calculation utilities.
 * Calculates working minutes between two dates, skipping non-working hours and holidays.
 */

export interface WorkingHours {
  start: string; // "08:00"
  end: string;   // "18:00"
}

/**
 * Calculate the number of working minutes between two dates.
 * Skips weekends, non-working hours, and holidays.
 */
export function calculateWorkingMinutes(
  from: Date,
  to: Date,
  workingHours: WorkingHours = { start: '08:00', end: '18:00' },
  holidays: string[] = [] // YYYY-MM-DD strings
): number {
  let totalMinutes = 0;
  const current = new Date(from);
  const startHour = parseInt(workingHours.start.split(':')[0]);
  const startMin = parseInt(workingHours.start.split(':')[1]);
  const endHour = parseInt(workingHours.end.split(':')[0]);
  const endMin = parseInt(workingHours.end.split(':')[1]);
  const dailyMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);

  while (current < to) {
    const dayOfWeek = current.getDay();
    const dateStr = current.toISOString().split('T')[0];

    // Skip weekends (0=Sun, 6=Sat)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      current.setDate(current.getDate() + 1);
      current.setHours(0, 0, 0, 0);
      continue;
    }

    // Skip holidays
    if (holidays.includes(dateStr)) {
      current.setDate(current.getDate() + 1);
      current.setHours(0, 0, 0, 0);
      continue;
    }

    // Calculate working minutes for this day
    const dayStart = new Date(current);
    dayStart.setHours(startHour, startMin, 0, 0);
    const dayEnd = new Date(current);
    dayEnd.setHours(endHour, endMin, 0, 0);

    const effectiveStart = current > dayStart ? current : dayStart;
    const effectiveEnd = to < dayEnd ? to : dayEnd;

    if (effectiveEnd > effectiveStart) {
      totalMinutes += (effectiveEnd.getTime() - effectiveStart.getTime()) / 60000;
    }

    // Move to next day
    current.setDate(current.getDate() + 1);
    current.setHours(0, 0, 0, 0);
  }

  return Math.round(totalMinutes);
}

/**
 * Calculate effective remaining working minutes from now until deadline.
 */
export function getEffectiveRemainingMinutes(
  deadline: string,
  workingHours: WorkingHours = { start: '08:00', end: '18:00' },
  holidays: string[] = []
): number {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  if (now >= deadlineDate) return 0;
  return calculateWorkingMinutes(now, deadlineDate, workingHours, holidays);
}

/**
 * Get the escalated priority when SLA is breached.
 * low -> medium -> high -> urgent (max)
 */
export function escalatePriority(current: 'low' | 'medium' | 'high' | 'urgent'): 'low' | 'medium' | 'high' | 'urgent' {
  const escalationMap: Record<string, 'low' | 'medium' | 'high' | 'urgent'> = {
    'low': 'medium',
    'medium': 'high',
    'high': 'urgent',
    'urgent': 'urgent', // no escalation beyond urgent
  };
  return escalationMap[current] || current;
}

/**
 * Check if SLA has been breached and whether escalation should be triggered.
 */
export function checkSLABreach(
  slaRecord: { responseDeadline: string; resolutionDeadline: string; breached: boolean; escalationTriggered: boolean },
  ticketPriority: string
): { breached: boolean; needsEscalation: boolean; newPriority: string } {
  const now = new Date();
  const responseBreached = now >= new Date(slaRecord.responseDeadline);
  const resolutionBreached = now >= new Date(slaRecord.resolutionDeadline);
  const isBreached = responseBreached || resolutionBreached;
  const needsEscalation = isBreached && !slaRecord.breached && !slaRecord.escalationTriggered;
  const newPriority = needsEscalation ? escalatePriority(ticketPriority as any) : ticketPriority;
  return { breached: isBreached, needsEscalation, newPriority };
}
