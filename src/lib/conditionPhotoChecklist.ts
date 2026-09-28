// Landlord ingoing condition / photo checklist, built room-by-room from South
// Australia's official CBS Inspection Sheet (cbs.sa.gov.au) under the
// Residential Tenancies Act 1995. Every item maps to a line on that form, so a
// manager can photograph the property against this list and then fill out the
// official sheet straight from the photo set. Landlord-facing only — this is a
// documentation aid for the ingoing/outgoing inspection, not the tenant's
// clean-up-before-a-routine-inspection list (that stays in inspectionChecklist.ts).
//
// Reusable default across properties: property-specific notes are kept generic
// and optional rooms are flagged "(if present)". Take a wide shot of each room
// first, then close-ups of every item.

import type { ChecklistSection } from "./inspectionChecklist";

export const CONDITION_PHOTO_CHECKLIST_NOTE =
  "Photograph the property against this list before the tenant moves in, then fill out the official CBS Inspection Sheet from the photos. The form rates each item Clean/Dirty, Fair/Good, Not working, Broken/Damaged or Scratched/Marked — for a freshly presented property the aim is to document its as-new baseline, which protects you at end of tenancy. Take a wide shot of each room first, then close-ups of every item.";

export const CONDITION_PHOTO_CHECKLIST: ChecklistSection[] = [
  {
    title: "Kitchen",
    items: [
      "Wide shot",
      "Stove top",
      "Griller",
      "Oven (inside and out)",
      "Sink / disposal unit",
      "Cupboards / drawers (open and closed)",
      "Bench tops",
      "Exhaust fan / vent",
      "Floor / covering",
      "Blinds / curtains (if any)",
      "Walls / doors",
      "Windows / screens",
      "Ceiling / light fittings",
      "Power points / switches",
      "Dishwasher (if included)",
    ],
  },
  {
    title: "Bathroom (main)",
    items: [
      "Wide shot",
      "Bath / spa (if present)",
      "Basin / vanity",
      "Shower recess",
      "Shower screen / curtain",
      "Mirror",
      "Towel rail / soap holder",
      "Exhaust fan / vent",
      "Floor / covering",
      "Blinds / curtains",
      "Walls / doors",
      "Windows / screens",
      "Ceiling / light fittings",
      "Power points / switches",
      "Shower head / rose",
    ],
  },
  {
    title: "Toilet (separate — fold into the bathroom if combined)",
    items: [
      "Bowl",
      "Seat",
      "Cistern",
      "Exhaust fan / vent",
      "Floor / covering",
      "Walls / doors",
      "Windows / screens",
      "Ceiling / light fittings",
      "Power points / switches",
    ],
  },
  {
    title: "Laundry (if present)",
    items: [
      "Wide shot",
      "Trough",
      "Cupboard/s",
      "Exhaust fan / vent",
      "Floor / covering",
      "Walls / doors",
      "Windows / screens",
      "Ceiling / light fittings",
      "Power points / switches",
    ],
  },
  {
    title: "Bedroom 1 (main)",
    items: [
      "Wide shot",
      "Built-ins (open and closed)",
      "Floor / covering",
      "Blinds / curtains",
      "Walls / doors",
      "Windows / screens",
      "Ceiling / light fittings",
      "Power points / switches",
    ],
  },
  {
    title: "Ensuite (if present)",
    items: [
      "Wide shot",
      "Basin / vanity / mirror",
      "Shower recess",
      "Shower screen / curtain",
      "Towel rail / soap holder",
      "Toilet bowl",
      "Toilet seat",
      "Cistern",
      "Exhaust fan / vent",
      "Floor / covering",
      "Walls / doors",
      "Windows / screens",
      "Shower head / rose",
      "Ceiling / light fittings",
      "Power points / switches",
    ],
  },
  {
    title: "Bedroom 2",
    items: [
      "Wide shot",
      "Built-ins",
      "Floor / covering",
      "Blinds / curtains",
      "Walls / doors",
      "Windows / screens",
      "Ceiling / light fittings",
      "Power points / switches",
    ],
  },
  {
    title: "Bedroom 3",
    items: [
      "Wide shot",
      "Built-ins",
      "Floor / covering",
      "Blinds / curtains",
      "Walls / doors",
      "Windows / screens",
      "Ceiling / light fittings",
      "Power points / switches",
    ],
  },
  {
    title: "Additional bedroom / other room (log under “Other Room” on the form)",
    items: [
      "Wide shot",
      "Built-ins",
      "Floor / covering",
      "Blinds / curtains",
      "Walls / doors",
      "Windows / screens",
      "Ceiling / light fittings",
      "Power points / switches",
    ],
  },
  {
    title: "Lounge / open-plan living",
    items: [
      "Wide shot",
      "Heating / cooling system (if any)",
      "Floor / covering",
      "Blinds / curtains",
      "Walls / doors",
      "Windows / screens",
      "Ceiling / light fittings",
      "Power points / switches",
    ],
  },
  {
    title: "Exterior",
    items: [
      "Letterbox",
      "External awnings (if any)",
      "Security / screen doors",
      "Concrete footpaths",
      "Garden (front)",
      "Lawn (front)",
      "Garden (back)",
      "Lawn (back)",
      "Garden hose / fittings",
      "Watering system (if any)",
      "Driveway",
      "TV antenna (if any)",
      "Clothesline",
      "Garbage bin",
      "Gutters",
    ],
  },
  {
    title: "Garage / carport (if present)",
    items: [
      "Wide shot",
      "Floor",
      "Walls / doors",
      "Windows / screens",
      "Shelves (if any)",
      "Ceiling / light fittings",
      "Power points / switches",
    ],
  },
  {
    title: "General",
    items: [
      "Smoke detectors — every one, ideally showing the test button pressed",
      "Security system (if any)",
      "Remote controls (if any, photographed together)",
      "Roller shutters (if any)",
    ],
  },
  {
    title: "Meters, keys & documentation",
    items: [
      "Water meter reading (kL) — clear close-up",
      "Electricity meter reading — clear close-up",
      "All keys laid out and counted (note the number — goes on the form)",
      "Appliance manuals / instructions, if provided, photographed as a set",
    ],
  },
];
