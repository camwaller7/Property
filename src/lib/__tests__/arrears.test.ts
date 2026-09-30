import { describe, it, expect } from "vitest";
import {
  arrearsStatus,
  daysSince,
  nextArrearsStage,
  stageLabel,
  arrearsLetter,
  ARREARS_STAGES,
} from "../arrears";
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

describe("daysSince", () => {
  it("counts whole days, negative for the future", () => {
    expect(daysSince("2026-01-01", "2026-01-15")).toBe(14);
    expect(daysSince("2026-02-01", "2026-01-15")).toBe(-17);
    expect(daysSince("2026-01-15", "2026-01-15")).toBe(0);
  });
});

describe("arrearsStatus", () => {
  const payments = [
    pay({ id: "1", due_date: "2026-01-01", amount: 500, received_date: "2026-01-01" }), // paid
    pay({ id: "2", due_date: "2026-01-08", amount: 500 }), // overdue at asOf
    pay({ id: "3", due_date: "2026-01-15", amount: 500 }), // overdue at asOf
    pay({ id: "4", due_date: "2026-02-01", amount: 500 }), // not yet due
  ];

  it("sums only unpaid past-due instalments", () => {
    const s = arrearsStatus(payments, "2026-01-20");
    expect(s.amount).toBe(1000);
    expect(s.overdueCount).toBe(2);
    expect(s.isInArrears).toBe(true);
  });

  it("dates arrears from the oldest unpaid past-due instalment", () => {
    const s = arrearsStatus(payments, "2026-01-20");
    expect(s.oldestDueDate).toBe("2026-01-08");
    expect(s.daysInArrears).toBe(12);
  });

  it("an instalment due exactly on asOf is not yet in arrears", () => {
    const s = arrearsStatus(payments, "2026-01-15");
    expect(s.overdueCount).toBe(1); // only Jan 8
    expect(s.oldestDueDate).toBe("2026-01-08");
  });

  it("is not in arrears when everything due is paid", () => {
    const s = arrearsStatus(
      [pay({ id: "1", due_date: "2026-01-01", amount: 500, received_date: "2026-01-02" })],
      "2026-02-01"
    );
    expect(s).toMatchObject({ isInArrears: false, amount: 0, overdueCount: 0, oldestDueDate: null, daysInArrears: 0 });
  });

  it("ignores undated and null-amount rows sensibly", () => {
    const s = arrearsStatus(
      [pay({ id: "1", due_date: null, amount: 500 }), pay({ id: "2", due_date: "2026-01-01", amount: null })],
      "2026-02-01"
    );
    expect(s.overdueCount).toBe(1); // the dated one counts
    expect(s.amount).toBe(0); // null amount treated as 0
    expect(s.isInArrears).toBe(false); // amount is 0
  });
});

describe("nextArrearsStage", () => {
  it("walks the ladder in order", () => {
    expect(nextArrearsStage([])).toBe("reminder");
    expect(nextArrearsStage(["reminder"])).toBe("second_notice");
    expect(nextArrearsStage(["reminder", "second_notice"])).toBe("breach_notice");
    expect(nextArrearsStage(["reminder", "second_notice", "breach_notice"])).toBe("escalation");
  });
  it("returns null once every stage is done, regardless of order", () => {
    expect(nextArrearsStage(["escalation", "breach_notice", "reminder", "second_notice"])).toBeNull();
  });
  it("skips to the first missing stage", () => {
    expect(nextArrearsStage(["reminder", "breach_notice"])).toBe("second_notice");
  });
});

describe("stageLabel / ARREARS_STAGES", () => {
  it("has four ordered stages with labels", () => {
    expect(ARREARS_STAGES.map((s) => s.stage)).toEqual(["reminder", "second_notice", "breach_notice", "escalation"]);
    expect(stageLabel("breach_notice")).toBe("Breach / remedy notice");
  });
});

describe("arrearsLetter", () => {
  const base = {
    tenantName: "Sam Tenant",
    propertyAddress: "1 Eltham Ave",
    landlordName: "A. Owner",
    amount: 1000,
    daysInArrears: 12,
    asOf: "2026-01-20",
    authorityName: "Consumer and Business Services (CBS)",
    tribunalName: "SACAT",
    brandName: "Corvelle Property",
  };

  it("includes the tenant, address, formatted amount and days", () => {
    const t = arrearsLetter({ ...base, stage: "reminder" });
    expect(t).toContain("Sam Tenant");
    expect(t).toContain("1 Eltham Ave");
    expect(t).toContain("$1,000.00");
    expect(t).toContain("12 days");
  });

  it("always carries the not-legal-advice / confirm-with-authority note", () => {
    for (const s of ARREARS_STAGES) {
      const t = arrearsLetter({ ...base, stage: s.stage });
      expect(t).toContain("not legal advice");
      expect(t).toContain("Consumer and Business Services (CBS)");
    }
  });

  it("names the tribunal at the escalation stage", () => {
    expect(arrearsLetter({ ...base, stage: "escalation" })).toContain("SACAT");
  });

  it("falls back gracefully when optional fields are missing", () => {
    const t = arrearsLetter({
      stage: "reminder",
      amount: 500,
      daysInArrears: 1,
      asOf: "2026-01-02",
      brandName: "Corvelle Property",
    });
    expect(t).toContain("Tenant");
    expect(t).toContain("your rental property");
    expect(t).toContain("1 day"); // singular
  });
});
