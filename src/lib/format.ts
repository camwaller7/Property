import type { Property, Payment } from "./types";

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
