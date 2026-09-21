import { NextResponse } from "next/server";
import Stripe from "stripe";

// Creates a Stripe Checkout Session to upgrade an org to Pro. Requires
// STRIPE_SECRET_KEY and STRIPE_PRICE_ID (a recurring price) in the environment.
// Returns { url } to redirect the browser to. Until configured, returns 501.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const price = process.env.STRIPE_PRICE_ID;
  if (!secret || !price) {
    return NextResponse.json(
      { error: "Billing isn't configured yet. Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID." },
      { status: 501 }
    );
  }

  let body: { orgId?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body.orgId) {
    return NextResponse.json({ error: "Missing organization." }, { status: 400 });
  }

  const origin = req.headers.get("origin") || new URL(req.url).origin;
  const stripe = new Stripe(secret);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      client_reference_id: body.orgId,
      metadata: { org_id: body.orgId },
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
