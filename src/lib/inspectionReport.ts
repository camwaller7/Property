// Routine inspection report helpers. A report is a room-by-room record of the
// property's condition at a routine inspection: each area gets a condition
// rating, notes and photos, plus an overall condition and summary. Kept as pure
// helpers so they're unit-testable and shared between the manager editor, the
// printable page and the tenant portal view.

export type AreaCondition = "good" | "fair" | "poor" | "na";

export interface InspectionArea {
  area: string;
  condition: AreaCondition;
  notes: string;
  photos: string[]; // private storage paths in the inspection-reports bucket
}

// The standard areas an Australian routine inspection walks through. Managers
// can rename, remove or add areas, but this is a sensible starting checklist.
export const DEFAULT_INSPECTION_AREAS: string[] = [
  "Entry / hallway",
  "Living areas",
  "Kitchen",
  "Bathroom(s)",
  "Toilet(s)",
  "Bedrooms",
  "Laundry",
  "Windows & window coverings",
  "Walls, ceilings & doors",
  "Flooring",
  "Smoke alarms",
  "Outdoor / yard / gardens",
  "Garage / carport / parking",
  "General cleanliness & rubbish",
];

export const CONDITION_OPTIONS: { value: AreaCondition; label: string }[] = [
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair — minor attention" },
  { value: "poor", label: "Poor — needs action" },
  { value: "na", label: "N/A — not inspected" },
];

export const CONDITION_LABEL: Record<AreaCondition, string> = {
  good: "Good",
  fair: "Fair",
  poor: "Poor",
  na: "N/A",
};

// Badge tone for a condition, matching the app's good/warn/bad/neutral palette.
export function conditionTone(c: AreaCondition | string | null | undefined): "good" | "warn" | "bad" | "neutral" {
  switch (c) {
    case "good":
      return "good";
    case "fair":
      return "warn";
    case "poor":
      return "bad";
    default:
      return "neutral";
  }
}

// A fresh set of areas for a new report, all defaulted to "good" with no notes.
export function newInspectionAreas(names: string[] = DEFAULT_INSPECTION_AREAS): InspectionArea[] {
  return names.map((area) => ({ area, condition: "good", notes: "", photos: [] }));
}

export interface ReportSummary {
  total: number; // areas actually inspected (excludes N/A)
  good: number;
  fair: number;
  poor: number;
  attention: number; // fair + poor
  photos: number;
}

// Roll up an area list for the report header / dashboard: how many areas are
// good, need minor attention (fair) or need action (poor), and total photos.
export function summariseAreas(areas: Pick<InspectionArea, "condition" | "photos">[]): ReportSummary {
  let good = 0,
    fair = 0,
    poor = 0,
    photos = 0;
  for (const a of areas) {
    photos += a.photos?.length ?? 0;
    switch (a.condition) {
      case "good":
        good++;
        break;
      case "fair":
        fair++;
        break;
      case "poor":
        poor++;
        break;
      // "na" (not inspected) is excluded from the counts and the total.
    }
  }
  return { total: good + fair + poor, good, fair, poor, attention: fair + poor, photos };
}

// Suggest an overall condition from the per-area ratings: any "poor" -> poor;
// else any "fair" -> fair; else good. Returns null when nothing was inspected.
export function suggestOverallCondition(
  areas: Pick<InspectionArea, "condition">[]
): AreaCondition | null {
  let sawGood = false;
  for (const a of areas) {
    if (a.condition === "poor") return "poor";
    if (a.condition === "fair") return "fair";
    if (a.condition === "good") sawGood = true;
  }
  return sawGood ? "good" : null;
}
