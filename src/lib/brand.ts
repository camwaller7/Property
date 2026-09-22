// Central brand config so the whole product can be rethemed/renamed from one
// place as it grows from a personal tracker into a real-estate company.
export const brand = {
  name: "Corvelle Property",
  full: "Corvelle Property",
  domain: "corvelleproperty.com",
  url: "https://corvelleproperty.com",
  email: "admin@corvelleproperty.com",
  // The four pillars the platform is organised around — the shape of the
  // business, not just the app's nav.
  tagline: "Your whole property world, in one place.",
  description:
    "Corvelle Property is the operating system for a modern property portfolio — investments, rentals, renovations and management, tracked and run from a single place.",
  pillars: [
    {
      key: "invest",
      label: "Invest",
      headline: "Know your position, always.",
      body: "Value, debt, equity and gearing across every property — the numbers that tell you when to buy, hold or sell.",
    },
    {
      key: "rent",
      label: "Rent",
      headline: "Never chase rent again.",
      body: "A live ledger per property with automatic paid, due and late status, arrears flags and lease-expiry alerts.",
    },
    {
      key: "renovate",
      label: "Renovate",
      headline: "Every dollar, filed and found.",
      body: "Capture receipts, categorise spend and track renovation cost against value added — tax-time ready.",
    },
    {
      key: "manage",
      label: "Manage",
      headline: "Self-manage like a pro.",
      body: "Inspections, compliance and tenant communication on a schedule, so nothing slips and everything's on file.",
    },
  ],
} as const;
