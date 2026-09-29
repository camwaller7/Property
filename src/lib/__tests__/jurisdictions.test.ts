import { describe, it, expect } from "vitest";
import {
  JURISDICTIONS,
  STATE_CODES,
  jurisdiction,
  maxBond,
  type StateCode,
} from "@/lib/jurisdictions";

const ALL_STATES: StateCode[] = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT", "NT"];

describe("JURISDICTIONS coverage", () => {
  it("defines all eight Australian states/territories", () => {
    expect(STATE_CODES.sort()).toEqual([...ALL_STATES].sort());
  });

  it("every jurisdiction has authority, bonds, tribunal and tenantInfo links with https URLs", () => {
    for (const code of ALL_STATES) {
      const j = JURISDICTIONS[code];
      for (const link of [j.authority, j.bonds, j.tribunal, j.tenantInfo]) {
        expect(link.name.length).toBeGreaterThan(0);
        expect(link.url).toMatch(/^https:\/\//);
      }
    }
  });

  it("every jurisdiction has a sane inspection notice window", () => {
    for (const code of ALL_STATES) {
      const { minNoticeDays, maxNoticeDays } = JURISDICTIONS[code].inspection;
      expect(minNoticeDays).toBeGreaterThan(0);
      expect(maxNoticeDays).toBeGreaterThanOrEqual(minNoticeDays);
    }
  });

  it("code field matches the map key", () => {
    for (const code of ALL_STATES) {
      expect(JURISDICTIONS[code].code).toBe(code);
    }
  });
});

describe("jurisdiction()", () => {
  it("resolves a known state", () => {
    expect(jurisdiction("SA")?.name).toBe("South Australia");
  });
  it("returns null for unknown or empty input", () => {
    expect(jurisdiction("XX")).toBeNull();
    expect(jurisdiction(null)).toBeNull();
    expect(jurisdiction(undefined)).toBeNull();
  });
});

describe("maxBond()", () => {
  it("computes 4 weeks for a standard NSW bond", () => {
    expect(maxBond(500, "NSW")).toBe(2000);
  });

  it("applies the SA threshold: 4 weeks at/below $800, 6 weeks above", () => {
    expect(maxBond(800, "SA")).toBe(800 * 4); // at threshold => 4 weeks
    expect(maxBond(900, "SA")).toBe(900 * 6); // above threshold => 6 weeks
  });

  it("returns null for VIC where the rule isn't a simple week multiple", () => {
    expect(maxBond(400, "VIC")).toBeNull();
  });

  it("returns null for missing/NaN rent", () => {
    expect(maxBond(null, "NSW")).toBeNull();
    expect(maxBond(undefined, "NSW")).toBeNull();
    expect(maxBond(Number.NaN, "NSW")).toBeNull();
  });

  it("returns null for an unknown state", () => {
    expect(maxBond(500, "ZZ")).toBeNull();
    expect(maxBond(500, null)).toBeNull();
  });
});
