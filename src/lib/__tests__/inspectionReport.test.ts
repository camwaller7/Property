import { describe, it, expect } from "vitest";
import {
  newInspectionAreas,
  summariseAreas,
  suggestOverallCondition,
  conditionTone,
  DEFAULT_INSPECTION_AREAS,
  type InspectionArea,
} from "@/lib/inspectionReport";

describe("newInspectionAreas", () => {
  it("builds the default checklist, all good and empty", () => {
    const areas = newInspectionAreas();
    expect(areas.length).toBe(DEFAULT_INSPECTION_AREAS.length);
    expect(areas.every((a) => a.condition === "good" && a.notes === "" && a.photos.length === 0)).toBe(true);
    expect(areas[0].area).toBe(DEFAULT_INSPECTION_AREAS[0]);
  });
  it("accepts a custom area list", () => {
    const areas = newInspectionAreas(["Studio", "Balcony"]);
    expect(areas.map((a) => a.area)).toEqual(["Studio", "Balcony"]);
  });
});

describe("summariseAreas", () => {
  const areas: Pick<InspectionArea, "condition" | "photos">[] = [
    { condition: "good", photos: ["a", "b"] },
    { condition: "fair", photos: ["c"] },
    { condition: "poor", photos: [] },
    { condition: "na", photos: ["d"] },
  ];
  it("counts conditions, attention items and photos, excluding N/A from total", () => {
    const s = summariseAreas(areas);
    expect(s.good).toBe(1);
    expect(s.fair).toBe(1);
    expect(s.poor).toBe(1);
    expect(s.attention).toBe(2); // fair + poor
    expect(s.total).toBe(3); // excludes the N/A area
    expect(s.photos).toBe(4);
  });
  it("handles an empty list", () => {
    expect(summariseAreas([])).toEqual({ total: 0, good: 0, fair: 0, poor: 0, attention: 0, photos: 0 });
  });
});

describe("suggestOverallCondition", () => {
  it("returns poor if any area is poor", () => {
    expect(suggestOverallCondition([{ condition: "good" }, { condition: "poor" }, { condition: "fair" }])).toBe("poor");
  });
  it("returns fair if any area is fair but none poor", () => {
    expect(suggestOverallCondition([{ condition: "good" }, { condition: "fair" }])).toBe("fair");
  });
  it("returns good when all inspected areas are good", () => {
    expect(suggestOverallCondition([{ condition: "good" }, { condition: "na" }])).toBe("good");
  });
  it("returns null when nothing was inspected", () => {
    expect(suggestOverallCondition([{ condition: "na" }])).toBeNull();
    expect(suggestOverallCondition([])).toBeNull();
  });
});

describe("conditionTone", () => {
  it("maps conditions to palette tones", () => {
    expect(conditionTone("good")).toBe("good");
    expect(conditionTone("fair")).toBe("warn");
    expect(conditionTone("poor")).toBe("bad");
    expect(conditionTone("na")).toBe("neutral");
    expect(conditionTone(null)).toBe("neutral");
  });
});
