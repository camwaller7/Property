// Inspection scheduling helpers. Routine inspections are auto-scheduled
// quarterly from the lease start (first one 3 months in), each snapped to the
// nearest weekday, and each gets reminder emails/markers a month, a fortnight
// and 3 days ahead.

// Days before an inspection that a reminder fires.
export const REMINDER_DAYS = [30, 14, 3] as const;

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Snap a date to the nearest weekday: Saturday → Friday, Sunday → Monday.
export function nearestWeekday(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay(); // 0 Sun … 6 Sat
  if (day === 6) d.setDate(d.getDate() - 1);
  else if (day === 0) d.setDate(d.getDate() + 1);
  return iso(d);
}

// Subtract N days from a YYYY-MM-DD date, returning YYYY-MM-DD.
export function minusDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() - days);
  return iso(d);
}

// Quarterly routine-inspection dates from a lease start. The first is 3 months
// after the start; then every 3 months. Bounded by lease_end when the lease is
// fixed-term, otherwise capped at `maxCount` (default 8 = two years). Each is
// snapped to the nearest weekday.
export function quarterlyInspectionDates(
  leaseStart: string | null | undefined,
  leaseEnd?: string | null,
  maxCount = 8
): string[] {
  if (!leaseStart) return [];
  const start = new Date(leaseStart + "T00:00:00");
  if (Number.isNaN(start.getTime())) return [];
  const end = leaseEnd ? new Date(leaseEnd + "T00:00:00") : null;

  const dates: string[] = [];
  for (let q = 1; q <= 200; q++) {
    const d = new Date(start);
    d.setMonth(d.getMonth() + q * 3);
    if (end && d.getTime() > end.getTime()) break;
    dates.push(nearestWeekday(iso(d)));
    if (!end && dates.length >= maxCount) break;
    if (dates.length >= 40) break; // hard safety cap
  }
  return dates;
}
