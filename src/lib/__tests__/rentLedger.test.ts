import { describe, it, expect } from "vitest";
import { ledgerRows, ledgerSummary, sortByDue, ledgerCsv } from "../rentLedger";
import type { Payment } from "../types";

function pay(p: Partial<Payment> & { id: string }): Payment {
  return {
    id: p.id,
    property_id: p.property_id ?? "prop1",
    due_date: p.due_date ?? null,
    amount: p.amount ?? null,
    received_date: p.received_date ?? null,
    status: p.status ?? "due",
  };
}

describe("sortByDue", () => {
  it("orders ascending by due date, undated last, stable by id", () => {
    const rows = sortByDue([
      pay({ id: "b", due_date: "2026-02-01" }),
      pay({ id: "a", due_date: "2026-01-01" }),
      pay({ id: "z", due_date: null }),
      pay({ id: "c", due_date: "2026-02-01" }),
    ]);
    expect(rows.map((r) => r.id)).toEqual(["a", "b", "c", "z"]);
  });
});

describe("ledgerRows", () => {
  it("carries a running balance: unpaid adds, paid nets to zero", () => {
    const rows = ledgerRows([
      pay({ id: "1", due_date: "2026-01-01", amount: 500, received_date: "2026-01-01" }),
      pay({ id: "2", due_date: "2026-01-08", amount: 500 }), // unpaid
      pay({ id: "3", due_date: "2026-01-15", amount: 500, received_date: "2026-01-16" }),
      pay({ id: "4", due_date: "2026-01-22", amount: 500 }), // unpaid
    ]);
    expect(rows.map((r) => r.balance)).toEqual([0, 500, 500, 1000]);
    expect(rows[0].paid).toBe(500);
    expect(rows[1].paid).toBe(0);
  });

  it("treats a null amount as 0", () => {
    const rows = ledgerRows([pay({ id: "1", due_date: "2026-01-01", amount: null })]);
    expect(rows[0].amount).toBe(0);
    expect(rows[0].balance).toBe(0);
  });
});

describe("ledgerSummary", () => {
  const payments = [
    pay({ id: "1", due_date: "2026-01-01", amount: 500, received_date: "2026-01-01" }),
    pay({ id: "2", due_date: "2026-01-08", amount: 500 }), // overdue as of 2026-01-20
    pay({ id: "3", due_date: "2026-01-15", amount: 500 }), // overdue as of 2026-01-20
    pay({ id: "4", due_date: "2026-02-01", amount: 500 }), // upcoming
  ];

  it("totals charged/received and the outstanding balance", () => {
    const s = ledgerSummary(payments, "2026-01-20");
    expect(s.totalCharged).toBe(2000);
    expect(s.totalReceived).toBe(500);
    expect(s.balance).toBe(1500);
    expect(s.chargeCount).toBe(4);
    expect(s.paidCount).toBe(1);
  });

  it("counts only past-due unpaid instalments as arrears", () => {
    const s = ledgerSummary(payments, "2026-01-20");
    expect(s.arrears).toBe(1000); // instalments 2 and 3
    expect(s.overdueCount).toBe(2);
  });

  it("an instalment due exactly on asOf is not yet in arrears", () => {
    const s = ledgerSummary(payments, "2026-01-15");
    expect(s.arrears).toBe(500); // only instalment 2 (Jan 8)
    expect(s.overdueCount).toBe(1);
  });

  it("nextDueDate is the earliest upcoming unpaid instalment", () => {
    expect(ledgerSummary(payments, "2026-01-20").nextDueDate).toBe("2026-02-01");
  });

  it("falls back to the earliest past-due when nothing is upcoming", () => {
    expect(ledgerSummary(payments, "2026-03-01").nextDueDate).toBe("2026-01-08");
  });

  it("is all-zero for an empty ledger", () => {
    const s = ledgerSummary([], "2026-01-20");
    expect(s).toMatchObject({ totalCharged: 0, totalReceived: 0, balance: 0, arrears: 0, nextDueDate: null });
  });
});

describe("ledgerCsv", () => {
  it("emits a header plus one row per instalment with 2dp money", () => {
    const rows = ledgerRows([pay({ id: "1", due_date: "2026-01-01", amount: 500, received_date: "2026-01-02", status: "late" })]);
    const csv = ledgerCsv(rows);
    expect(csv[0]).toEqual(["Due date", "Amount charged", "Received date", "Amount received", "Status", "Running balance"]);
    expect(csv[1]).toEqual(["2026-01-01", "500.00", "2026-01-02", "500.00", "late", "0.00"]);
    expect(csv).toHaveLength(2); // no totals row without a summary
  });

  it("appends a totals row when a summary is passed (parity with the printed table)", () => {
    const payments = [
      pay({ id: "1", due_date: "2026-01-01", amount: 500, received_date: "2026-01-01" }),
      pay({ id: "2", due_date: "2026-01-08", amount: 500 }),
    ];
    const csv = ledgerCsv(ledgerRows(payments), ledgerSummary(payments, "2026-01-20"));
    expect(csv[csv.length - 1]).toEqual(["Totals", "1000.00", "", "500.00", "", "500.00"]);
  });
});
