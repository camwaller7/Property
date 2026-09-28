import type { ComplianceKind, ComplianceItem } from "./types";

// Labels + suggested defaults for the compliance & safety register. Cadences are
// COMMON baselines only — the exact requirement varies by state/territory, so
// each item's interval is editable and the UI says "confirm for your state".
export const COMPLIANCE_KIND_LABEL: Record<string, string> = {
  smoke_alarm: "Smoke alarms",
  gas: "Gas safety check",
  electrical: "Electrical safety check",
  pool: "Pool / spa fence compliance",
  blind_cords: "Corded blinds / window safety",
  min_standards: "Minimum housing standards",
  other: "Other compliance item",
};

export const COMPLIANCE_KINDS: ComplianceKind[] = [
  "smoke_alarm",
  "gas",
  "electrical",
  "pool",
  "blind_cords",
  "min_standards",
  "other",
];

// Suggested default cadence in months (common Australian baselines). Editable.
export const COMPLIANCE_DEFAULT_INTERVAL: Record<string, number> = {
  smoke_alarm: 12,
  gas: 24,
  electrical: 24,
  pool: 36,
  blind_cords: 12,
  min_standards: 12,
  other: 12,
};

// Short "who does this" hint shown under each kind.
export const COMPLIANCE_PROVIDER_HINT: Record<string, string> = {
  smoke_alarm: "Licensed technician or per your state's rules",
  gas: "Licensed gas fitter",
  electrical: "Licensed electrician",
  pool: "Certified pool-safety inspector",
  blind_cords: "Anchored / compliant cords",
  min_standards: "Heating, locks, ventilation, etc.",
  other: "",
};

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// next_due = last_done + interval_months (used when marking an item done).
export function computeNextDue(lastDone: string, intervalMonths: number): string {
  const d = new Date(lastDone + "T00:00:00");
  if (Number.isNaN(d.getTime())) return lastDone;
  d.setMonth(d.getMonth() + Math.max(1, intervalMonths));
  return iso(d);
}

export type ComplianceStatus = "overdue" | "due_soon" | "ok" | "unscheduled";

// Status for an item relative to today. due_soon window defaults to 30 days.
export function complianceStatus(item: ComplianceItem, soonDays = 30): ComplianceStatus {
  if (!item.next_due) return "unscheduled";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(item.next_due + "T00:00:00");
  if (Number.isNaN(due.getTime())) return "unscheduled";
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return "overdue";
  if (diffDays <= soonDays) return "due_soon";
  return "ok";
}
