import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Stripe webhook: keeps the organization's plan/subscription in sync. Requires
// STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY (server-only). It verifies Stripe's signature, then
// writes with the service role (the only place that key is used).
export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !whSecret || !supaUrl || !serviceKey) {
    return NextResponse.json({ error: "Billing webhook not configured." }, { status: 501 });
  }

  const stripe = new Stripe(secret);
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig ?? "", whSecret);
  } catch (e) {
    return NextResponse.json(
      { error: `Signature verification failed: ${e instanceof Error ? e.message : "unknown"}` },
      { status: 400 }
    );
  }

  const admin = createClient(supaUrl, serviceKey, { auth: { persistSession: false } });

  async function setPlan(orgId: string, fields: Record<string, unknown>) {
    await admin.from("organizations").update(fields).eq("id", orgId);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;

        // Rent payment: mark the exact ledger row paid.
        if (s.metadata?.kind === "rent" && s.metadata?.payment_id) {
          const paymentId = s.metadata.payment_id;
          await admin
            .from("payments")
            .update({ received_date: new Date().toISOString().slice(0, 10), status: "paid", paid_online: true })
            .eq("id", paymentId);
          if (s.metadata.org_id) {
            await admin.from("notifications").insert({
              org_id: s.metadata.org_id,
              type: "rent_paid",
              title: "Rent paid online",
              body: `A tenant paid ${s.amount_total ? "$" + (s.amount_total / 100).toFixed(0) : "rent"} online.`,
              link: "/app/properties",
              entity_id: paymentId,
            });
          }
          break;
        }

        // Otherwise: subscription upgrade. The tier (plus|pro) rides in metadata.
        const orgId = s.client_reference_id || s.metadata?.org_id;
        const tier = s.metadata?.tier === "plus" ? "plus" : "pro";
        if (orgId) {
          await setPlan(orgId, {
            plan: tier,
            subscription_status: "active",
            stripe_customer_id: typeof s.customer === "string" ? s.customer : null,
            stripe_subscription_id: typeof s.subscription === "string" ? s.subscription : null,
          });
        }
        break;
      }
      case "account.updated": {
        // Connected account (Stripe Connect) status changed — track whether the
        // landlord can accept charges yet.
        const acct = event.data.object as Stripe.Account;
        await admin
          .from("organizations")
          .update({ stripe_charges_enabled: !!acct.charges_enabled })
          .eq("stripe_account_id", acct.id);
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.org_id;
        const tier = sub.metadata?.tier === "plus" ? "plus" : "pro";
        const active = sub.status === "active" || sub.status === "trialing";
        // Prefer org_id from metadata; otherwise match by customer id.
        const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end;
        const fields = {
          plan: active ? tier : "free",
          subscription_status: sub.status,
          current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        };
        if (orgId) {
          await setPlan(orgId, fields);
        } else if (typeof sub.customer === "string") {
          await admin.from("organizations").update(fields).eq("stripe_customer_id", sub.customer);
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Webhook handler error." },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
