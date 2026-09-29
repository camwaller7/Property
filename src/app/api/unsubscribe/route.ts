import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyUnsubscribe } from "@/lib/unsubscribeToken";

// Records an unsubscribe after verifying the HMAC-signed token. Called by the
// public /unsubscribe confirmation page (POST, so link-prefetch by mail clients
// can't opt someone out with a bare GET). The signing secret lives only here in
// the server env — the DB never sees it.
export async function POST(req: Request) {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Unsubscribe isn't configured. Set UNSUBSCRIBE_SECRET." },
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

  try {
    await supabase.rpc("record_email_unsubscribe", { p_email: email });
  } catch {
    return NextResponse.json({ error: "Couldn't record your request. Please try again." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
