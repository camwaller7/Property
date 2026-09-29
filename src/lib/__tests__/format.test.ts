import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  fmtMoney,
  fmtPct,
  daysUntil,
  nextWeekdayDate,
  equity,
  lvr,
  grossYield,
  annualRent,
  portfolioStats,
} from "@/lib/format";
import type { Property, Payment } from "@/lib/types";

// Minimal property factory — only the fields the finance helpers read.
function prop(over: Partial<Property> = {}): Property {
  return {
    id: "p1",
    current_value: null,
    loan_balance: null,
    purchase_price: null,
    weekly_rent: null,
    lease_end: null,
    ...over,
  } as Property;
}

describe("fmtMoney", () => {
  it("formats a whole-dollar amount with a $ and no decimals", () => {
    expect(fmtMoney(1234)).toBe("$1,234");
  });
  it("renders an em-dash for null/undefined/NaN", () => {
    expect(fmtMoney(null)).toBe("—");
    expect(fmtMoney(undefined)).toBe("—");
    expect(fmtMoney(Number.NaN)).toBe("—");
  });
  it("shows a negative sign only when sign option is set", () => {
    expect(fmtMoney(-50)).toBe("$50");
    expect(fmtMoney(-50, { sign: true })).toBe("-$50");
  });
});

describe("fmtPct", () => {
  it("formats a ratio as a percentage to one decimal by default", () => {
    expect(fmtPct(0.075)).toBe("7.5%");
  });
  it("honours a custom digit count", () => {
    expect(fmtPct(0.12345, 2)).toBe("12.35%");
  });
  it("renders an em-dash for null", () => {
    expect(fmtPct(null)).toBe("—");
  });
});

describe("daysUntil / nextWeekdayDate (time-dependent)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Thursday 2026-01-01, local midday.
    vi.setSystemTime(new Date("2026-01-01T12:00:00"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts whole days until a future date", () => {
    expect(daysUntil("2026-01-08")).toBe(7);
  });
  it("returns 0 for today and negatives for the past", () => {
    expect(daysUntil("2026-01-01")).toBe(0);
    expect(daysUntil("2025-12-31")).toBe(-1);
  });
  it("returns null for no date", () => {
    expect(daysUntil(null)).toBeNull();
  });

  it("finds the next occurrence of a weekday (today counts)", () => {
    // 2026-01-01 is a Thursday.
    expect(nextWeekdayDate("Thursday")).toBe("2026-01-01");
    expect(nextWeekdayDate("friday")).toBe("2026-01-02");
    expect(nextWeekdayDate("Wednesday")).toBe("2026-01-07");
  });
  it("returns null for an unrecognised day name", () => {
    expect(nextWeekdayDate("Someday")).toBeNull();
    expect(nextWeekdayDate(null)).toBeNull();
  });
});

describe("per-property finance", () => {
  it("equity = value - loan, null if either missing", () => {
    expect(equity(prop({ current_value: 800000, loan_balance: 500000 }))).toBe(300000);
    expect(equity(prop({ current_value: 800000 }))).toBeNull();
  });
  it("lvr = loan / value, null when value is 0/absent", () => {
    expect(lvr(prop({ current_value: 1000000, loan_balance: 600000 }))).toBeCloseTo(0.6);
    expect(lvr(prop({ loan_balance: 600000 }))).toBeNull();
  });
  it("grossYield uses value, falling back to purchase price", () => {
    expect(grossYield(prop({ current_value: 520000, weekly_rent: 500 }))).toBeCloseTo(0.05);
    expect(grossYield(prop({ purchase_price: 520000, weekly_rent: 500 }))).toBeCloseTo(0.05);
    expect(grossYield(prop({ weekly_rent: 500 }))).toBeNull();
  });
  it("annualRent = weekly * 52", () => {
    expect(annualRent(prop({ weekly_rent: 500 }))).toBe(26000);
    expect(annualRent(prop())).toBeNull();
  });
});

describe("portfolioStats", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00"));
  });
  afterEach(() => vi.useRealTimers());

  it("rolls up totals, LVR, payment states and lease alerts", () => {
    const properties = [
      prop({ id: "a", current_value: 800000, loan_balance: 500000, weekly_rent: 500, lease_end: "2026-01-20" }),
      prop({ id: "b", current_value: 600000, loan_balance: 300000, weekly_rent: 400, lease_end: "2027-01-01" }),
    ];
    const payments: Record<string, Payment[]> = {
      a: [{ status: "late" } as Payment, { status: "due" } as Payment],
      b: [{ status: "paid" } as Payment],
    };
    const s = portfolioStats(properties, payments);
    expect(s.count).toBe(2);
    expect(s.totalValue).toBe(1400000);
    expect(s.totalDebt).toBe(800000);
    expect(s.totalEquity).toBe(600000);
    expect(s.totalWeeklyRent).toBe(900);
    expect(s.lvr).toBeCloseTo(800000 / 1400000);
    expect(s.lateCount).toBe(1);
    expect(s.dueCount).toBe(1);
    expect(s.leaseAlerts).toBe(1); // only property a's lease is within 30 days
  });

  it("handles an empty portfolio with a null LVR", () => {
    const s = portfolioStats([], {});
    expect(s.count).toBe(0);
    expect(s.totalEquity).toBe(0);
    expect(s.lvr).toBeNull();
  });
});
