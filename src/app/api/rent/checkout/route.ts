import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabase";

// Starts a Stripe Checkout session for a tenant to pay a specific rent
// instalment. The payment is verified (by portal token) to belong to the
// tenancy and still be payable before charging. On success, the billing webhook
// marks that ledger row paid. Requires STRIPE_SECRET_KEY.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json(
      { error: "Online payments aren't set up yet. Please contact your property manager." },
      { status: 501 }
    );
  }

  let body: { token?: string; paymentId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body.token || !body.paymentId) {
    return NextResponse.json({ error: "Missing payment reference." }, { status: 400 });
  }

  // Token-scoped verification (SECURITY DEFINER RPC).
  const { data, error } = await supabase.rpc("portal_payment_for_checkout", {
    p_token: body.token,
    p_payment_id: body.paymentId,
  });
  if (error || !data || data.error) {
    return NextResponse.json({ error: "This payment can't be paid online." }, { status: 400 });
  }

  const amountCents = Math.round(Number(data.amount) * 100);
  if (!amountCents || amountCents < 100) {
    return NextResponse.json({ error: "Invalid amount." }, { status: 400 });
  }

  const origin = req.headers.get("origin") || new URL(req.url).origin;
  const stripe = new Stripe(secret);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "aud",
            unit_amount: amountCents,
            product_data: {
              name: `Rent${data.address ? ` — ${data.address}` : ""}`,
              description: data.due_date ? `Due ${data.due_date}` : undefined,
            },
          },
        },
      ],
      customer_email: data.tenant_email || undefined,
      metadata: {
        kind: "rent",
        payment_id: body.paymentId,
        org_id: data.org_id ?? "",
        property_id: data.property_id ?? "",
      },
      success_url: `${origin}/portal/${body.token}?paid=1`,
      cancel_url: `${origin}/portal/${body.token}`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Couldn't start payment." },
      { status: 502 }
    );
  }
}
