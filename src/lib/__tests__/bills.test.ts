import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { projectBillDates, BILL_KINDS, BILL_FREQUENCIES } from "@/lib/bills";

describe("projectBillDates", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00"));
  });
  afterEach(() => vi.useRealTimers());

  it("returns [] with no anchor date or an invalid one", () => {
    expect(projectBillDates(null, "quarterly")).toEqual([]);
    expect(projectBillDates("nope", "quarterly")).toEqual([]);
  });

  // The horizon is measured from *now* (mocked to 2026-01-01), so an occurrence
  // that would fall past now+horizonMonths is correctly dropped.
  it("steps quarterly (3-month) up to a 12-month horizon", () => {
    const dates = projectBillDates("2026-01-15", "quarterly", 12);
    expect(dates).toEqual(["2026-01-15", "2026-04-15", "2026-07-15", "2026-10-15"]);
  });

  it("steps annually", () => {
    const dates = projectBillDates("2026-03-01", "annual", 24);
    expect(dates).toEqual(["2026-03-01", "2027-03-01"]);
  });

  it("steps monthly", () => {
    const dates = projectBillDates("2026-01-10", "monthly", 3);
    expect(dates).toEqual(["2026-01-10", "2026-02-10", "2026-03-10"]);
  });

  it("defaults an unknown frequency to quarterly", () => {
    const dates = projectBillDates("2026-01-15", "fortnightly-typo", 6);
    expect(dates).toEqual(["2026-01-15", "2026-04-15"]);
  });

  it("includes a stale (past) anchor so the imminent occurrence still shows", () => {
    const dates = projectBillDates("2025-11-15", "quarterly", 12);
    expect(dates[0]).toBe("2025-11-15");
  });
});

describe("bill catalogue constants", () => {
  it("exposes the expected kinds and frequencies", () => {
    expect(BILL_KINDS).toContain("council_rates");
    expect(BILL_KINDS).toContain("land_tax");
    expect(BILL_FREQUENCIES).toEqual(["quarterly", "annual", "monthly"]);
  });
});
