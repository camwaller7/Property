"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { brand } from "@/lib/brand";
import { PASSWORD_HINT, passwordProblem } from "@/lib/password";

// Tenant account creation. The link a manager sends (/tenant/claim/<token>)
// lands here. The signup is tagged { role: 'tenant', portal_token } so the
// handle_new_user trigger links the account to the tenancy instead of creating
// a manager workspace. After confirming, they sign in from /tenant.
export default function TenantClaimPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;

  const [address, setAddress] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<"confirm" | "in" | null>(null);

  // Validate the token and greet with the property address (token-scoped RPC).
  useEffect(() => {
    let active = true;
    supabase.rpc("portal_get", { p_token: token }).then(({ data, error }) => {
      if (!active) return;
      if (error || !data) {
        setInvalid(true);
        return;
      }
      const payload = data as { property?: { address?: string | null } | null };
      setAddress(payload.property?.address ?? null);
    });
    return () => {
      active = false;
    };
  }, [token]);

  async function submit() {
    if (!email || !password) return setErr("Enter your email and choose a password.");
    const problem = passwordProblem(password);
    if (problem) return setErr(problem);
    setBusy(true);
    setErr("");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: "tenant", portal_token: token },
        emailRedirectTo: `${window.location.origin}/tenant`,
      },
    });
    setBusy(false);
    if (error) return setErr(error.message);
    setDone(data.session ? "in" : "confirm");
    if (data.session) router.replace("/tenant");
  }

  if (invalid) {
    return (
      <Centered>
        <h1 className="text-2xl font-semibold tracking-tight">Link not found</h1>
        <p className="mt-2 text-muted">This sign-up link is invalid or has expired. Please check with your property manager.</p>
      </Centered>
    );
  }

  if (done === "confirm") {
    return (
      <Centered>
        <h1 className="text-2xl font-semibold tracking-tight">Almost there ✓</h1>
        <p className="mt-2 text-muted">
          We&apos;ve sent a confirmation email. Confirm your address, then sign in to your portal from the{" "}
          <Link href="/tenant" className="text-accent hover:underline">Tenant login</Link>.
        </p>
      </Centered>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8">
        <h1 className="text-center text-2xl font-semibold tracking-tight">{brand.name}</h1>
        <p className="mt-2 text-center text-sm text-muted">
          Create your tenant portal account{address ? ` for ${address}` : ""}.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input
            type="email"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="mt-5 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-accent"
          />
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Choose a password"
            className="mt-3 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-accent"
          />
          <p className="mt-2 text-xs text-muted">{PASSWORD_HINT}</p>
          <button
            type="submit"
            disabled={busy}
            className="mt-4 w-full rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>
        <p className="mt-2 min-h-[18px] text-center text-sm text-bad">{err}</p>
        <p className="mt-2 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/tenant" className="text-accent hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">{children}</div>
    </div>
  );
}
