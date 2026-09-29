import { describe, it, expect } from "vitest";
import { deletionScheduledDate, deletionDaysLeft, DELETION_GRACE_DAYS } from "@/lib/account";

describe("deletionScheduledDate", () => {
  it("adds the 30-day grace window", () => {
    expect(DELETION_GRACE_DAYS).toBe(30);
    expect(deletionScheduledDate("2026-01-01T00:00:00Z")).toBe("2026-01-31");
  });
  it("crosses month/year boundaries", () => {
    expect(deletionScheduledDate("2026-12-20T12:00:00Z")).toBe("2027-01-19");
  });
  it("returns null for no/invalid request", () => {
    expect(deletionScheduledDate(null)).toBeNull();
    expect(deletionScheduledDate(undefined)).toBeNull();
    expect(deletionScheduledDate("nope")).toBeNull();
  });
});

describe("deletionDaysLeft", () => {
  it("counts whole days remaining from a fixed 'now'", () => {
    // Requested 2026-01-01 → scheduled 2026-01-31. On 2026-01-21, 10 days left.
    expect(deletionDaysLeft("2026-01-01T00:00:00Z", new Date("2026-01-21T09:00:00"))).toBe(10);
  });
  it("never goes negative past the window", () => {
    expect(deletionDaysLeft("2026-01-01T00:00:00Z", new Date("2026-03-01T00:00:00"))).toBe(0);
  });
  it("returns null when nothing is pending", () => {
    expect(deletionDaysLeft(null)).toBeNull();
  });
});
