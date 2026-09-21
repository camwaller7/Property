import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Starts (or resumes) Stripe Connect onboarding for the caller's org, so the
// landlord collects rent into their OWN Stripe account. The caller is verified
// by their Supabase access token: we act as that user (RLS), so they can only
// touch their own org, and the org update requires admin.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!secret) {
    return NextResponse.json({ error: "Payments aren't configured on this app yet." }, { status: 501 });
  }
  if (!url || !anon) {
    return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  // Act as the signed-in user — RLS confines everything to their org.
  const sb = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: orgs, error: orgErr } = await sb.from("organizations").select("*").limit(1);
  if (orgErr || !orgs || orgs.length === 0) {
    return NextResponse.json({ error: "No organization found." }, { status: 400 });
  }
  const org = orgs[0];

  const stripe = new Stripe(secret);
  const origin = req.headers.get("origin") || new URL(req.url).origin;

  try {
    let accountId: string | undefined = org.stripe_account_id ?? undefined;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        metadata: { org_id: org.id },
      });
      accountId = account.id;
      // This update is allowed only for org admins (RLS org update policy).
      const upd = await sb
        .from("organizations")
        .update({ stripe_account_id: accountId })
        .eq("id", org.id);
      if (upd.error) {
        return NextResponse.json(
          { error: "Only an organization admin can connect Stripe." },
          { status: 403 }
        );
      }
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/app/billing?connect=refresh`,
      return_url: `${origin}/app/billing?connect=done`,
      type: "account_onboarding",
    });
    return NextResponse.json({ url: link.url });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Couldn't start Stripe onboarding." },
      { status: 502 }
    );
  }
}
