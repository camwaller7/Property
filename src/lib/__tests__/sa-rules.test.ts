import { describe, it, expect } from "vitest";
import {
  isSunday,
  inspectionWindow,
  validateRoutineInspection,
  defaultOnboarding,
  INSPECTION_NOTICE_MIN_DAYS,
  INSPECTION_NOTICE_MAX_DAYS,
} from "@/lib/sa-rules";

describe("isSunday", () => {
  it("detects a Sunday", () => {
    // 2026-01-04 is a Sunday.
    expect(isSunday("2026-01-04")).toBe(true);
  });
  it("returns false for a weekday", () => {
    // 2026-01-05 is a Monday.
    expect(isSunday("2026-01-05")).toBe(false);
  });
  it("returns false for null/undefined/empty", () => {
    expect(isSunday(null)).toBe(false);
    expect(isSunday(undefined)).toBe(false);
    expect(isSunday("")).toBe(false);
  });
});

describe("inspectionWindow", () => {
  it("returns the 7–28 day window after the notice date", () => {
    const { earliest, latest } = inspectionWindow("2026-01-01");
    expect(earliest).toBe("2026-01-08"); // +7
    expect(latest).toBe("2026-01-29"); // +28
  });
  it("uses the exported min/max day constants", () => {
    expect(INSPECTION_NOTICE_MIN_DAYS).toBe(7);
    expect(INSPECTION_NOTICE_MAX_DAYS).toBe(28);
  });
  it("crosses month boundaries correctly", () => {
    const { earliest, latest } = inspectionWindow("2026-02-25");
    expect(earliest).toBe("2026-03-04"); // +7 across Feb (28d, 2026 not a leap year)
    expect(latest).toBe("2026-03-25"); // +28
  });
});

describe("validateRoutineInspection", () => {
  it("accepts a date exactly 7 days out (min notice)", () => {
    expect(validateRoutineInspection("2026-01-01", "2026-01-08")).toEqual([]);
  });
  it("accepts a date exactly 28 days out (max notice)", () => {
    expect(validateRoutineInspection("2026-01-01", "2026-01-29")).toEqual([]);
  });
  it("flags too-little notice (6 days)", () => {
    const problems = validateRoutineInspection("2026-01-01", "2026-01-07");
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("at least 7 days");
  });
  it("flags too-much notice (29 days)", () => {
    const problems = validateRoutineInspection("2026-01-01", "2026-01-30");
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("at most 28 days");
  });
  it("flags a Sunday inspection", () => {
    // 2026-01-11 is a Sunday, 10 days after notice (within window).
    const problems = validateRoutineInspection("2026-01-01", "2026-01-11");
    expect(problems).toContain("Inspections can't be held on a Sunday.");
  });
  it("can report both a Sunday and a notice-window breach", () => {
    // 2026-02-01 is a Sunday and only 1 day after notice.
    const problems = validateRoutineInspection("2026-01-31", "2026-02-01");
    expect(problems.length).toBe(2);
  });
  it("returns no notice problems when either date is missing", () => {
    expect(validateRoutineInspection(null, "2026-01-08")).toEqual([]);
    expect(validateRoutineInspection("2026-01-01", null)).toEqual([]);
  });
});

describe("defaultOnboarding", () => {
  it("returns the SA onboarding checklist, all unticked", () => {
    const items = defaultOnboarding();
    expect(items.length).toBeGreaterThanOrEqual(10);
    expect(items.every((i) => i.done === false)).toBe(true);
  });
  it("includes the legally-required bond lodgement step", () => {
    const keys = defaultOnboarding().map((i) => i.key);
    expect(keys).toContain("bond_lodged");
    expect(keys).toContain("condition_report");
    expect(keys).toContain("info_statement");
  });
  it("has unique keys", () => {
    const keys = defaultOnboarding().map((i) => i.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
