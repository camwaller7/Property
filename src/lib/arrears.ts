import type { Payment } from "./types";
import { toISODate } from "./format";

// Rent-arrears workflow helpers, kept pure so they can be unit-tested without the
// DB or React. "Arrears" = scheduled rent instalments that are unpaid and whose
// due date has passed. This module powers a *tracking + communication* workflow
// (remind → formal notice → breach/remedy → escalate) and drafts letters; it
// deliberately does NOT assert the legally-required notice periods, which are
// state-specific and change — the UI points the manager to their state authority
// / tribunal (see ./jurisdictions) to confirm those. Guidance, not legal advice.

function amt(p: Payment): number {
  return typeof p.amount === "number" && !Number.isNaN(p.amount) ? p.amount : 0;
}

// Whole days from an ISO date (YYYY-MM-DD) to asOf, using local calendar days.
// Negative if the date is in the future.
export function daysSince(dateISO: string, asOf: string): number {
  const a = new Date(dateISO + "T00:00:00").getTime();
  const b = new Date(asOf + "T00:00:00").getTime();
  return Math.round((b - a) / 86400000);
}

export interface ArrearsStatus {
  isInArrears: boolean;
  amount: number; // sum of unpaid instalments whose due date has passed
  overdueCount: number; // how many such instalments
  oldestDueDate: string | null; // earliest unpaid past-due date
  daysInArrears: number; // whole days from oldestDueDate to asOf (0 if none)
}

// Arrears position for one property's payment rows as at `asOf` (default today).
export function arrearsStatus(payments: Payment[], asOf: string = toISODate(new Date())): ArrearsStatus {
  let amount = 0;
  let overdueCount = 0;
  let oldest: string | null = null;
  for (const p of payments) {
    if (p.received_date) continue; // paid
    if (!p.due_date || p.due_date >= asOf) continue; // not yet due
    amount += amt(p);
    overdueCount += 1;
    if (!oldest || p.due_date < oldest) oldest = p.due_date;
  }
  return {
    isInArrears: overdueCount > 0 && amount > 0,
    amount,
    overdueCount,
    oldestDueDate: oldest,
    daysInArrears: oldest ? Math.max(0, daysSince(oldest, asOf)) : 0,
  };
}

// The escalation ladder. Order matters: each stage is the natural next step.
// These are workflow labels, not statutory notices — the "breach" stage prompts
// the manager to issue their state's required form after confirming its notice
// period with the authority.
export type ArrearsStage = "reminder" | "second_notice" | "breach_notice" | "escalation";

export const ARREARS_STAGES: { stage: ArrearsStage; label: string; blurb: string }[] = [
  { stage: "reminder", label: "Friendly reminder", blurb: "A first, informal nudge that rent is overdue." },
  { stage: "second_notice", label: "Formal reminder", blurb: "A firmer written reminder requesting payment by a date." },
  { stage: "breach_notice", label: "Breach / remedy notice", blurb: "Issue your state's rent-arrears breach/termination form — confirm the required notice period with the authority first." },
  { stage: "escalation", label: "Escalate to tribunal", blurb: "Apply to the state tribunal if the arrears remain unresolved." },
];

export function stageLabel(stage: ArrearsStage): string {
  return ARREARS_STAGES.find((s) => s.stage === stage)?.label ?? stage;
}

// Given the stages already actioned, the next one to suggest (null once the
// ladder is exhausted). `done` need not be ordered.
export function nextArrearsStage(done: ArrearsStage[]): ArrearsStage | null {
  for (const s of ARREARS_STAGES) {
    if (!done.includes(s.stage)) return s.stage;
  }
  return null;
}

export interface ArrearsLetterInput {
  stage: ArrearsStage;
  tenantName?: string | null;
  propertyAddress?: string | null;
  landlordName?: string | null;
  amount: number;
  daysInArrears: number;
  asOf: string;
  authorityName?: string | null; // e.g. "Consumer and Business Services (CBS)"
  tribunalName?: string | null; // e.g. "SACAT"
  brandName: string;
}

function money(n: number): string {
  return "$" + (Math.round(n * 100) / 100).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// A plain-text draft the manager can review, edit and send/print. Tone escalates
// with the stage. Always ends with a "not legal advice / confirm with authority"
// note so the draft is never mistaken for a statutory notice.
export function arrearsLetter(input: ArrearsLetterInput): string {
  const who = input.tenantName?.trim() || "Tenant";
  const where = input.propertyAddress?.trim() || "your rental property";
  const from = input.landlordName?.trim() || input.brandName;
  const amt = money(input.amount);
  const days = input.daysInArrears;
  const authority = input.authorityName || "your state tenancy authority";
  const tribunal = input.tribunalName || "the state tenancy tribunal";

  const openings: Record<ArrearsStage, string> = {
    reminder:
      `Hi ${who},\n\nThis is a friendly reminder that rent for ${where} is currently overdue. ` +
      `Our records show ${amt} outstanding (about ${days} day${days === 1 ? "" : "s"} in arrears). ` +
      `If you've already paid, thank you — please disregard this note. Otherwise, could you please bring the account up to date, or reply so we can help.`,
    second_notice:
      `Dear ${who},\n\nWe've not yet received the overdue rent for ${where}. ` +
      `The amount outstanding is ${amt} (about ${days} days in arrears). ` +
      `Please arrange payment in full, or contact us to discuss a payment plan, as soon as possible.`,
    breach_notice:
      `Dear ${who},\n\nThis notice concerns unpaid rent for ${where}. ` +
      `The amount outstanding is ${amt} and the account is approximately ${days} days in arrears. ` +
      `You are asked to remedy this breach by paying the outstanding rent in full. ` +
      `If the arrears are not remedied, we may take further action to end the tenancy in accordance with the law.`,
    escalation:
      `Dear ${who},\n\nDespite previous reminders, rent for ${where} remains unpaid — ${amt} outstanding, ` +
      `approximately ${days} days in arrears. We intend to apply to ${tribunal} to resolve this matter. ` +
      `You may still avoid this by paying the outstanding rent in full immediately or contacting us to make arrangements.`,
  };

  const disclaimer =
    `\n\n— ${from}\n\n` +
    `This letter is a communication about your rent account, not a formal/statutory notice. ` +
    `Required notice periods and the correct forms for rent arrears are set by ${authority} and vary by state — ` +
    `confirm them with the authority before relying on any timeframe. This is not legal advice.`;

  return openings[input.stage] + disclaimer;
}
