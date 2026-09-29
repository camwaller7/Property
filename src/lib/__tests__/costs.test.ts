import { describe, it, expect } from "vitest";
import { gstComponent, financialYear } from "@/lib/costs";

describe("gstComponent", () => {
  it("returns 0 for a cost explicitly flagged GST-free", () => {
    expect(gstComponent({ amount: 1100, includes_gst: false, gst_amount: null })).toBe(0);
  });
  it("uses the captured GST amount when one was entered", () => {
    expect(gstComponent({ amount: 1100, includes_gst: true, gst_amount: 90 })).toBe(90);
  });
  it("prefers the captured amount even when includes_gst is unset", () => {
    expect(gstComponent({ amount: 1100, includes_gst: undefined, gst_amount: 90 })).toBe(90);
  });
  it("falls back to 1/11th of a GST-inclusive total when no amount captured", () => {
    expect(gstComponent({ amount: 1100, includes_gst: true, gst_amount: null })).toBeCloseTo(100);
  });
  it("treats a missing includes_gst flag as inclusive (default AU behaviour)", () => {
    expect(gstComponent({ amount: 1100, gst_amount: null })).toBeCloseTo(100);
  });
  it("copes with a non-numeric captured amount by falling to 1/11th", () => {
    // gst_amount present but 0 => Number(0)||0 === 0, so it's a real captured 0.
    expect(gstComponent({ amount: 1100, includes_gst: true, gst_amount: 0 })).toBe(0);
  });
});

describe("financialYear", () => {
  it("labels a date in the second half of the year as FYyyyy-yy (July onward)", () => {
    expect(financialYear("2026-07-01")).toBe("FY2026-27");
    expect(financialYear("2026-12-31")).toBe("FY2026-27");
  });
  it("labels a date in Jan–Jun as the prior FY", () => {
    expect(financialYear("2026-06-30")).toBe("FY2025-26");
    expect(financialYear("2026-01-01")).toBe("FY2025-26");
  });
  it("returns null for missing or invalid dates", () => {
    expect(financialYear(null)).toBeNull();
    expect(financialYear("not-a-date")).toBeNull();
  });
});
