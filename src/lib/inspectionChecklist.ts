// A comprehensive, room-by-room inspection preparation checklist shown to the
// tenant in their portal (always available, and linked from inspection
// reminders) and to the landlord in the workspace for reference when inspecting.
// This is the standard default; kept as content so it renders identically in
// both the public portal and the authenticated workspace with no data needed.

export interface ChecklistSection {
  title: string;
  items: string[];
}

export const INSPECTION_CHECKLIST: ChecklistSection[] = [
  {
    title: "Kitchen",
    items: [
      "Clean the oven inside — racks, glass door, and around the seals",
      "Clean the stovetop, burners/elements, and knobs; degrease the rangehood filter and surface",
      "Clean inside and outside the dishwasher; wipe the seals and clear the filter",
      "Wipe out the microwave inside and out",
      "Clean the fridge/freezer space (inside if it's the property's appliance)",
      "Wipe all benchtops, splashbacks, and tiles (remove grease and marks)",
      "Clean cupboard doors, handles, and inside shelves/drawers",
      "Clean and de-scale the sink and tapware; check for leaks",
      "Empty and wipe the bin area; take rubbish out",
    ],
  },
  {
    title: "Bathrooms & laundry",
    items: [
      "Scrub the toilet — bowl, seat, base, and behind",
      "Clean the shower screen, tiles, and grout; remove soap scum and mould",
      "Clean the bath and basin; polish tapware and mirrors",
      "Clear and wipe the exhaust fan cover",
      "Clean the vanity, cupboards, and drawers",
      "Wipe down the washing machine and dryer (and clean the lint filter)",
      "Clean the laundry tub and tapware; check for leaks",
      "Replace or clean any bath/floor mats",
    ],
  },
  {
    title: "Bedrooms & living areas",
    items: [
      "Dust and wipe all surfaces, shelves, and skirting boards",
      "Clean built-in wardrobe interiors, shelves, and mirrored/sliding doors",
      "Clean light switches, power points, and door handles",
      "Wipe down all doors and, importantly, the door frames and architraves",
      "Remove cobwebs from ceilings and corners",
      "Clean ceiling fans and light fittings",
      "Spot-clean walls (marks, scuffs, fingerprints)",
    ],
  },
  {
    title: "Windows, doors & floors",
    items: [
      "Clean windows inside and out where safely reachable",
      "Wipe window sills, tracks, and frames",
      "Clean and dust blinds; launder or wipe curtains",
      "Clean flyscreens and security doors",
      "Vacuum all carpets (steam clean if required by your lease)",
      "Mop all hard floors; clean edges and corners",
      "Clean entry mats and thresholds",
    ],
  },
  {
    title: "General & fixtures",
    items: [
      "Dust vents, air-conditioner filters, and heater grilles",
      "Wipe skirting boards and picture rails throughout",
      "Check and replace any dead light globes",
      "Test smoke alarms are present and not covered (report faults to your manager)",
      "Wipe down all internal doors and handles",
      "Ensure all rubbish and personal clutter is removed",
    ],
  },
  {
    title: "Outdoors, gardens & garage",
    items: [
      "Mow lawns and edge/whipper-snip borders",
      "Weed garden beds and paths",
      "Prune overgrown plants and sweep up clippings",
      "Sweep paths, patios, decking, and the driveway",
      "Remove cobwebs from eaves, entryways, and outdoor lights",
      "Clean the garage/carport floor and remove oil stains where possible",
      "Ensure bins are emptied and stored tidily",
      "Clear any rubbish or items from the yard",
    ],
  },
];
