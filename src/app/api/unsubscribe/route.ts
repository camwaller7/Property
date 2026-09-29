import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyUnsubscribe } from "@/lib/unsubscribeToken";

// Records an unsubscribe after verifying the HMAC-signed token. Called by the
// public /unsubscribe confirmation page (POST, so link-prefetch by mail clients
// can't opt someone out with a bare GET). The signing secret lives only here in
// the server env — the DB never sees it.
//
// record_email_unsubscribe is deliberately NOT callable by anon/authenticated
// (that would let anyone with the public anon key silently unsubscribe any
// address straight through the REST API, bypassing the HMAC check). So this
// route writes with the service-role key AFTER verifying the token — the anon
// client is never used for the write.
export async function POST(req: Request) {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  const supaUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tioeqxdulxqiptlszldp.supabase.co";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !serviceKey) {
    return NextResponse.json(
      { error: "Unsubscribe isn't configured. Set UNSUBSCRIBE_SECRET and SUPABASE_SERVICE_ROLE_KEY." },
      { status: 501 }
    );
  }

  let payload: { email?: string; token?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { email, token } = payload;
  if (!email || !token) {
    return NextResponse.json({ error: "Missing email or token." }, { status: 400 });
  }

  if (!verifyUnsubscribe(email, token, secret)) {
    return NextResponse.json({ error: "This unsubscribe link is invalid or expired." }, { status: 400 });
  }

  const admin = createClient(supaUrl, serviceKey, { auth: { persistSession: false } });
  const { error } = await admin.rpc("record_email_unsubscribe", { p_email: email });
  if (error) {
    return NextResponse.json({ error: "Couldn't record your request. Please try again." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
