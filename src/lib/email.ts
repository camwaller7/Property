"use client";

import { supabase } from "./supabase";

export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  tenancyId?: string;
  fromName?: string;
  replyTo?: string;
  token?: string; // tenant-portal callers pass their portal token instead of a session
}

// POST to /api/email, attaching the signed-in manager's access token so the
// endpoint can authorise the send (it rejects unauthenticated callers). Tenant
// portal callers should include `token` in the payload instead of a session.
export async function postEmail(payload: EmailPayload): Promise<Response> {
  let authHeader: Record<string, string> = {};
  if (!payload.token) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) authHeader = { Authorization: `Bearer ${token}` };
  }
  return fetch("/api/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader },
    body: JSON.stringify(payload),
  });
}
