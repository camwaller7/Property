import type { BillKind, BillFrequency } from "./types";

export const BILL_KIND_LABEL: Record<string, string> = {
  council_rates: "Council rates",
  water: "Water",
  insurance: "Insurance",
  strata: "Strata / body corp",
  land_tax: "Land tax",
  other: "Other bill",
};

export const BILL_KINDS: BillKind[] = ["council_rates", "water", "insurance", "strata", "land_tax", "other"];
export const BILL_FREQUENCIES: BillFrequency[] = ["quarterly", "annual", "monthly"];

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthsFor(freq: string): number {
  if (freq === "monthly") return 1;
  if (freq === "annual") return 12;
  return 3; // quarterly (default)
}

// Project a recurring bill's due dates from its anchor (next_due) forward, over
// `horizonMonths` (default 12). Past occurrences are included from the anchor so
// a slightly stale next_due still shows the imminent one.
export function projectBillDates(
  nextDue: string | null | undefined,
  frequency: string,
  horizonMonths = 12
): string[] {
  if (!nextDue) return [];
  const start = new Date(nextDue + "T00:00:00");
  if (Number.isNaN(start.getTime())) return [];
  const step = monthsFor(frequency);
  const horizon = new Date();
  horizon.setMonth(horizon.getMonth() + horizonMonths);

  const dates: string[] = [];
  for (let i = 0; i < 60; i++) {
    const d = new Date(start);
    d.setMonth(d.getMonth() + i * step);
    if (d.getTime() > horizon.getTime()) break;
    dates.push(iso(d));
  }
  return dates;
}
