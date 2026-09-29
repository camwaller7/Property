import { createClient } from "@supabase/supabase-js";

// The Supabase anon/publishable key is designed to be exposed in the browser;
// row-level security (not key secrecy) is what protects the data. We read from
// NEXT_PUBLIC_* env vars (set these in Vercel) and fall back to the existing
// project's public values so the app runs with zero config in development.
//
// SECURITY: every business table has RLS ENABLED with policies scoped to the
// `authenticated` role and `org_id in my_org_ids()` (verified live) — the anon
// role has no access, so an unauthenticated visitor sees nothing and one org
// can never read another's data. Sign-in is via Supabase Auth; the session
// below is persisted per-browser (login memory), which is why a returning user
// on the same browser is signed straight back in.
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tioeqxdulxqiptlszldp.supabase.co";

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpb2VxeGR1bHhxaXB0bHN6bGRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NjcxNzAsImV4cCI6MjEwNTI0MzE3MH0.EFqqd7l0mSfDJL4ndidZ7GDR3F5JGePOKaWAw8LGHq0";

// `detectSessionInUrl` lets the client hydrate a session from the token an
// email link returns (magic link / password reset / confirmation). We use the
// implicit flow so email links carry the session in the URL hash and can be
// consumed on any device (PKCE's code-verifier is device-local and breaks
// cross-device email links). The /auth/callback route reads the session and
// routes the user into /app.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "implicit",
  },
});
