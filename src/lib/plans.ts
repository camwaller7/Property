// Subscription plans. Limits/features are enforced softly in the UI; billing is
// wired through Stripe (see /api/billing). Prices are display-only — the real
// prices live in Stripe (see the STRIPE_PRICE_* env vars in docs/SETUP.md).
export type PlanKey = "free" | "plus" | "pro";

export interface Plan {
  key: PlanKey;
  name: string;
  priceLabel: string; // headline monthly price
  priceAnnualLabel: string; // headline annual price
  priceNote?: string; // e.g. annual equivalent / savings
  propertyLimit: number | null; // null = unlimited
  documents: boolean; // document & forms library
  onlineRent: boolean; // Stripe Connect rent collection
  team: boolean; // invite team members
  ai: boolean; // in-app AI assistant
  highlight?: boolean; // visually feature this plan
  features: string[];
}

export const PLANS: Record<PlanKey, Plan> = {
  free: {
    key: "free",
    name: "Free",
    priceLabel: "$0",
    priceAnnualLabel: "$0",
    propertyLimit: 1,
    documents: false,
    onlineRent: false,
    team: false,
    ai: false,
    features: [
      "1 property",
      "Rent ledger & tenancy",
      "Tenant onboarding & portal",
      "Maintenance & matters",
    ],
  },
  plus: {
    key: "plus",
    name: "Plus",
    priceLabel: "$20/mo",
    priceAnnualLabel: "$200/yr",
    priceNote: "or $200/yr — save $40",
    propertyLimit: 3,
    documents: true,
    onlineRent: true,
    team: true,
    ai: false,
    highlight: true,
    features: [
      "Up to 3 properties",
      "Document & forms library (state-aware)",
      "Online rent payments (Stripe)",
      "Team members",
      "Scheduled reminders",
      "Everything in Free",
    ],
  },
  pro: {
    key: "pro",
    name: "Pro",
    priceLabel: "$45/mo",
    priceAnnualLabel: "$450/yr",
    priceNote: "or $450/yr — save $90",
    propertyLimit: null,
    documents: true,
    onlineRent: true,
    team: true,
    ai: true,
    features: [
      "Unlimited properties",
      "AI assistant (fills forms & templates)",
      "Priority support",
      "Everything in Plus",
    ],
  },
};

// Statuses under which a paid plan's entitlements still apply. No status yet
// (during grace/testing) counts as healthy so nothing is blocked prematurely.
const HEALTHY = ["active", "trialing", "past_due"];
function healthy(status: string | null | undefined): boolean {
  return !status || HEALTHY.includes(status);
}

export function planFor(key: string | null | undefined): Plan {
  return PLANS[(key ?? "free") as PlanKey] ?? PLANS.free;
}

// The plan whose entitlements actually apply: a paid plan with an unhealthy
// subscription status falls back to Free so lapsed orgs lose paid features.
export function activePlan(key: string | null | undefined, status: string | null | undefined): Plan {
  const p = planFor(key);
  if (p.key !== "free" && !healthy(status)) return PLANS.free;
  return p;
}

// Entitlement helpers — use these to gate features, not raw plan-key checks.
export function isPaid(key: string | null | undefined, status: string | null | undefined): boolean {
  return activePlan(key, status).key !== "free";
}
export function hasDocuments(key: string | null | undefined, status: string | null | undefined): boolean {
  return activePlan(key, status).documents;
}
export function hasOnlineRent(key: string | null | undefined, status: string | null | undefined): boolean {
  return activePlan(key, status).onlineRent;
}
export function hasAI(key: string | null | undefined, status: string | null | undefined): boolean {
  return activePlan(key, status).ai;
}

// The smallest paid plan that unlocks the document & forms library — used in
// upgrade prompts so the copy names the right tier.
export const DOCUMENTS_PLAN = PLANS.plus;
