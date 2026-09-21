// Subscription plans. Limits are enforced softly in the UI; billing is wired
// through Stripe (see /api/billing). Prices are display-only — the real price
// lives in Stripe (STRIPE_PRICE_ID).
export interface Plan {
  key: string;
  name: string;
  priceLabel: string;
  propertyLimit: number | null; // null = unlimited
  features: string[];
}

export const PLANS: Record<string, Plan> = {
  free: {
    key: "free",
    name: "Free",
    priceLabel: "$0",
    propertyLimit: 1,
    features: ["1 property", "Rent ledger & tenancy", "Tenant onboarding & portal"],
  },
  pro: {
    key: "pro",
    name: "Pro",
    priceLabel: "$29/mo",
    propertyLimit: null,
    features: [
      "Unlimited properties",
      "Document & forms library",
      "Team members",
      "Online rent payments",
      "Everything in Free",
    ],
  },
};

export function planFor(key: string | null | undefined): Plan {
  return PLANS[key ?? "free"] ?? PLANS.free;
}

// Pro is active when the org is on the pro plan with a healthy subscription
// status (or no status yet during grace/testing).
export function isPro(plan: string | null | undefined, status: string | null | undefined): boolean {
  return plan === "pro" && (!status || ["active", "trialing", "past_due"].includes(status));
}
