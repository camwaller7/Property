import type { Property, Payment } from "./types";

// Format a Date as YYYY-MM-DD using its LOCAL calendar fields. The app treats
// plain "YYYY-MM-DD" values in the user's local calendar (dates are parsed as
// local midnight via `+ "T00:00:00"`), so any date built by local-time
// arithmetic must be serialised the same way. Using `toISOString()` here would
// re-interpret that local instant in UTC and shift the day by one for anyone
// east/west of Greenwich (e.g. Australia), which is exactly the off-by-one it
// used to produce.
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// The app's operating timezone. Client code can use the viewer's own local
// calendar (toISODate), but server-only code (webhooks, cron) has no viewer, so
// it dates events in this zone rather than UTC — otherwise a server running in
// UTC records the "wrong" calendar day for an AU operator near local midnight.
export const OPERATING_TZ = "Australia/Adelaide";

// Today's date (YYYY-MM-DD) in the operating timezone, independent of the
// runtime's own TZ. Use in server handlers that must stamp a local calendar day.
export function operatingToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: OPERATING_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function fmtMoney(n: number | null | undefined, opts?: { sign?: boolean }): string {
  if (n === undefined || n === null || Number.isNaN(Number(n))) return "—";
  const num = Number(n);
  const s = "$" + Math.abs(num).toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (opts?.sign && num < 0) return "-" + s;
  return s;
}

export function fmtPct(n: number | null | undefined, digits = 1): string {
  if (n === undefined || n === null || Number.isNaN(Number(n))) return "—";
  return (Number(n) * 100).toFixed(digits) + "%";
}

export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / 86400000);
}

export function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

// Next occurrence (today or later) of a named weekday, e.g. "Friday". Returns a
// YYYY-MM-DD string, or null if the day name isn't recognised.
export function nextWeekdayDate(dayName: string | null | undefined): string | null {
  if (!dayName) return null;
  const target = WEEKDAYS.indexOf(dayName.trim().toLowerCase());
  if (target < 0) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = (target - now.getDay() + 7) % 7;
  now.setDate(now.getDate() + diff);
  return toISODate(now);
}

// ---- Per-property finance ------------------------------------------------

export function equity(p: Property): number | null {
  if (p.current_value == null || p.loan_balance == null) return null;
  return Number(p.current_value) - Number(p.loan_balance);
}

export function lvr(p: Property): number | null {
  if (!p.current_value || p.loan_balance == null) return null;
  return Number(p.loan_balance) / Number(p.current_value);
}

// Gross rental yield against current value (falls back to purchase price).
export function grossYield(p: Property): number | null {
  const base = p.current_value || p.purchase_price;
  if (!base || p.weekly_rent == null) return null;
  return (Number(p.weekly_rent) * 52) / Number(base);
}

export function annualRent(p: Property): number | null {
  if (p.weekly_rent == null) return null;
  return Number(p.weekly_rent) * 52;
}

// ---- Portfolio rollups ---------------------------------------------------

export interface PortfolioStats {
  count: number;
  totalValue: number;
  totalDebt: number;
  totalEquity: number;
  totalWeeklyRent: number;
  lvr: number | null;
  lateCount: number;
  dueCount: number;
  leaseAlerts: number;
}

export function portfolioStats(
  properties: Property[],
  paymentsByProperty: Record<string, Payment[]>
): PortfolioStats {
  let totalValue = 0;
  let totalDebt = 0;
  let totalWeeklyRent = 0;
  let lateCount = 0;
  let dueCount = 0;
  let leaseAlerts = 0;

  for (const p of properties) {
    if (p.current_value) totalValue += Number(p.current_value);
    if (p.loan_balance) totalDebt += Number(p.loan_balance);
    if (p.weekly_rent) totalWeeklyRent += Number(p.weekly_rent);
    const d = daysUntil(p.lease_end);
    if (d !== null && d <= 30) leaseAlerts++;
    for (const pay of paymentsByProperty[p.id] || []) {
      if (pay.status === "late") lateCount++;
      else if (pay.status === "due") dueCount++;
    }
  }

  return {
    count: properties.length,
    totalValue,
    totalDebt,
    totalEquity: totalValue - totalDebt,
    totalWeeklyRent,
    lvr: totalValue > 0 ? totalDebt / totalValue : null,
    lateCount,
    dueCount,
    leaseAlerts,
  };
}
