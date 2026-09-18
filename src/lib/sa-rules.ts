// South Australian residential tenancy rules, encoded so the app can guide
// self-management. Sources: SA Residential Tenancies Act / Consumer & Business
// Services guidance. These are helpers, not legal advice.

// Bond: capped at 4 weeks' rent when weekly rent is $800 or less; 6 weeks above.
export const BOND_HIGH_RENT_THRESHOLD = 800;

export function maxBond(weeklyRent: number | null | undefined): number | null {
  if (weeklyRent == null || Number.isNaN(Number(weeklyRent))) return null;
  const weeks = Number(weeklyRent) <= BOND_HIGH_RENT_THRESHOLD ? 4 : 6;
  return Number(weeklyRent) * weeks;
}

// Routine inspections: written notice 7–28 days before entry, max 4 per year,
// between 8am–8pm, not on a Sunday or public holiday, max 2 hours.
export const INSPECTION_NOTICE_MIN_DAYS = 7;
export const INSPECTION_NOTICE_MAX_DAYS = 28;
export const MAX_ROUTINE_INSPECTIONS_PER_YEAR = 4;

export function isSunday(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return new Date(dateStr + "T00:00:00").getDay() === 0;
}

// Given a notice-sent date, the earliest and latest valid routine-inspection
// dates (inclusive), as YYYY-MM-DD strings.
export function inspectionWindow(noticeSentDate: string): { earliest: string; latest: string } {
  const base = new Date(noticeSentDate + "T00:00:00");
  const earliest = new Date(base);
  earliest.setDate(base.getDate() + INSPECTION_NOTICE_MIN_DAYS);
  const latest = new Date(base);
  latest.setDate(base.getDate() + INSPECTION_NOTICE_MAX_DAYS);
  return { earliest: iso(earliest), latest: iso(latest) };
}

// Validate a scheduled routine inspection against the notice window + Sunday
// rule. Returns a list of human-readable problems (empty = OK).
export function validateRoutineInspection(
  noticeSentDate: string | null,
  scheduledDate: string | null
): string[] {
  const problems: string[] = [];
  if (isSunday(scheduledDate)) {
    problems.push("Inspections can't be held on a Sunday.");
  }
  if (noticeSentDate && scheduledDate) {
    const notice = new Date(noticeSentDate + "T00:00:00");
    const scheduled = new Date(scheduledDate + "T00:00:00");
    const days = Math.round((scheduled.getTime() - notice.getTime()) / 86400000);
    if (days < INSPECTION_NOTICE_MIN_DAYS) {
      problems.push(`Needs at least ${INSPECTION_NOTICE_MIN_DAYS} days' written notice (this gives ${days}).`);
    }
    if (days > INSPECTION_NOTICE_MAX_DAYS) {
      problems.push(`Notice can be given at most ${INSPECTION_NOTICE_MAX_DAYS} days before (this is ${days}).`);
    }
  }
  return problems;
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Default move-in onboarding checklist for a new SA tenancy. Seeded when a
// tenancy is created so it can be ticked off with the tenant.
export interface OnboardingItem {
  key: string;
  label: string;
  done: boolean;
  done_date?: string | null;
}

export function defaultOnboarding(): OnboardingItem[] {
  return [
    { key: "agreement", label: "Residential tenancy agreement signed", done: false },
    { key: "condition_report", label: "Ingoing condition report completed & shared (within 2 business days)", done: false },
    { key: "bond_collected", label: "Bond collected from tenant", done: false },
    { key: "bond_lodged", label: "Bond lodged with Consumer & Business Services (CBS)", done: false },
    { key: "first_rent", label: "First rent payment received", done: false },
    { key: "smoke_alarms", label: "Smoke alarms tested & compliant", done: false },
    { key: "keys", label: "Keys / remotes handed over", done: false },
    { key: "handbook", label: "Tenant handbook & contact details provided", done: false },
    { key: "emergency_contacts", label: "Emergency & maintenance contacts shared", done: false },
    { key: "insurance", label: "Landlord insurance confirmed active", done: false },
  ];
}
