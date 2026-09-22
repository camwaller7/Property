import { NextResponse } from "next/server";
import Stripe from "stripe";

// Creates a Stripe Checkout Session to upgrade an org to a paid plan (Plus or
// Pro), monthly or annual. Requires STRIPE_SECRET_KEY plus the matching price
// env var for the chosen plan+cycle:
//   STRIPE_PRICE_PLUS_MONTHLY / STRIPE_PRICE_PLUS_ANNUAL
//   STRIPE_PRICE_PRO_MONTHLY  / STRIPE_PRICE_PRO_ANNUAL
// Returns { url } to redirect the browser to. Until configured, returns 501.
type PaidPlan = "plus" | "pro";
type Cycle = "monthly" | "annual";

function priceEnvFor(plan: PaidPlan, cycle: Cycle): string | undefined {
  const key = `STRIPE_PRICE_${plan.toUpperCase()}_${cycle.toUpperCase()}`;
  return process.env[key];
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json(
      { error: "Billing isn't configured yet. Set STRIPE_SECRET_KEY and the STRIPE_PRICE_* variables." },
      { status: 501 }
    );
  }

  let body: { orgId?: string; email?: string; plan?: string; cycle?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body.orgId) {
    return NextResponse.json({ error: "Missing organization." }, { status: 400 });
  }

  const plan: PaidPlan = body.plan === "pro" ? "pro" : "plus";
  const cycle: Cycle = body.cycle === "annual" ? "annual" : "monthly";
  const price = priceEnvFor(plan, cycle);
  if (!price) {
    return NextResponse.json(
      { error: `Billing isn't configured for the ${plan}/${cycle} price yet.` },
      { status: 501 }
    );
  }

  const origin = req.headers.get("origin") || new URL(req.url).origin;
  const stripe = new Stripe(secret);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      client_reference_id: body.orgId,
      metadata: { org_id: body.orgId, tier: plan },
      // Carry the tier onto the subscription so later webhook events
      // (updated/deleted) can restore the correct plan.
      subscription_data: { metadata: { org_id: body.orgId, tier: plan } },
      customer_email: body.email,
      success_url: `${origin}/app/billing?upgraded=1`,
      cancel_url: `${origin}/app/billing`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Couldn't start checkout." },
      { status: 502 }
    );
  }
}
