import type { Payment } from "./types";
import { toISODate } from "./format";

// Rent ledger maths, kept pure so it can be unit-tested without the DB or React.
// Each `payments` row is one scheduled rent instalment: a charge of `amount` on
// `due_date`, credited in full when `received_date` is set (the data model has
// no partial payments). The running balance is cumulative(charged − received).

export interface LedgerRow {
  id: string;
  due_date: string | null;
  amount: number; // charged this instalment
  received_date: string | null;
  paid: number; // credited (the amount, once received; else 0)
  status: Payment["status"];
  balance: number; // running outstanding after this row
}

export interface LedgerSummary {
  totalCharged: number;
  totalReceived: number;
  balance: number; // charged − received (everything unpaid, due or not)
  arrears: number; // unpaid instalments whose due date is in the past
  overdueCount: number;
  paidCount: number;
  chargeCount: number;
  nextDueDate: string | null; // earliest unpaid instalment on/after asOf, else earliest unpaid
}

function amt(p: Payment): number {
  return typeof p.amount === "number" && !Number.isNaN(p.amount) ? p.amount : 0;
}

export function todayISO(): string {
  // Local "today" — an AU manager's calendar day, not UTC's (which can be the
  // previous/next day for them near midnight).
  return toISODate(new Date());
}

// Ascending by due date (undated rows last), then by id so the order is stable.
export function sortByDue(payments: Payment[]): Payment[] {
  return [...payments].sort((a, b) => {
    const ad = a.due_date || "";
    const bd = b.due_date || "";
    if (ad && bd) return ad.localeCompare(bd) || a.id.localeCompare(b.id);
    if (ad) return -1;
    if (bd) return 1;
    return a.id.localeCompare(b.id);
  });
}

export function ledgerRows(payments: Payment[]): LedgerRow[] {
  let balance = 0;
  return sortByDue(payments).map((p) => {
    const charged = amt(p);
    const paid = p.received_date ? charged : 0;
    balance += charged - paid;
    return {
      id: p.id,
      due_date: p.due_date,
      amount: charged,
      received_date: p.received_date,
      paid,
      status: p.status,
      balance,
    };
  });
}

export function ledgerSummary(payments: Payment[], asOf: string = todayISO()): LedgerSummary {
  let totalCharged = 0;
  let totalReceived = 0;
  let arrears = 0;
  let overdueCount = 0;
  let paidCount = 0;
  const unpaidUpcoming: string[] = [];
  const unpaidPast: string[] = [];

  for (const p of payments) {
    const charged = amt(p);
    totalCharged += charged;
    if (p.received_date) {
      totalReceived += charged;
      paidCount += 1;
      continue;
    }
    // Unpaid: an instalment strictly before asOf is in arrears.
    if (p.due_date && p.due_date < asOf) {
      arrears += charged;
      overdueCount += 1;
      unpaidPast.push(p.due_date);
    } else if (p.due_date) {
      unpaidUpcoming.push(p.due_date);
    }
  }

  unpaidUpcoming.sort();
  unpaidPast.sort();
  const nextDueDate = unpaidUpcoming[0] ?? unpaidPast[0] ?? null;

  return {
    totalCharged,
    totalReceived,
    balance: totalCharged - totalReceived,
    arrears,
    overdueCount,
    paidCount,
    chargeCount: payments.length,
    nextDueDate,
  };
}

// CSV rows (header + body, plus a Totals row when a summary is given) for the
// ledger, as a string matrix. The page turns this into a downloadable file;
// keeping it here makes it testable and keeps the CSV in step with the printed
// table (which also shows a totals row).
export function ledgerCsv(rows: LedgerRow[], summary?: LedgerSummary): string[][] {
  const header = ["Due date", "Amount charged", "Received date", "Amount received", "Status", "Running balance"];
  const body = rows.map((r) => [
    r.due_date || "",
    r.amount.toFixed(2),
    r.received_date || "",
    r.paid.toFixed(2),
    r.status,
    r.balance.toFixed(2),
  ]);
  const matrix = [header, ...body];
  if (summary) {
    matrix.push([
      "Totals",
      summary.totalCharged.toFixed(2),
      "",
      summary.totalReceived.toFixed(2),
      "",
      summary.balance.toFixed(2),
    ]);
  }
  return matrix;
}
