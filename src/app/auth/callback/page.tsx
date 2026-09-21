"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { brand } from "@/lib/brand";

// Receives the auth redirect from email links (magic link, password reset,
// confirmation). The Supabase client hydrates the session from the URL
// (detectSessionInUrl); we also handle a PKCE `?code=` param just in case.
// Once a session exists we route into the workspace.
export default function AuthCallbackPage() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let done = false;
    const go = (path: string) => {
      if (done) return;
      done = true;
      router.replace(path);
    };

    async function resolve() {
      // If this is a password-reset link, send them to set a new password.
      const isRecovery =
        window.location.hash.includes("type=recovery") ||
        new URLSearchParams(window.location.search).get("type") === "recovery";

      // PKCE fallback: exchange a `?code=` for a session if present.
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        try {
          await supabase.auth.exchangeCodeForSession(window.location.href);
        } catch {
          /* fall through to getSession */
        }
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) go(isRecovery ? "/auth/reset" : "/app");
    }

    resolve();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        const isRecovery = window.location.hash.includes("type=recovery");
        go(isRecovery ? "/auth/reset" : "/app");
      }
    });

    const timer = setTimeout(() => {
      if (!done) setFailed(true);
    }, 6000);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-sm text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{brand.name}</h1>
        {failed ? (
          <>
            <p className="mt-3 text-sm text-muted">
              We couldn&apos;t complete sign-in from this link — it may have expired or already been
              used. Please request a fresh link.
            </p>
            <Link
              href="/app"
              className="mt-5 inline-block rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background hover:opacity-80"
            >
              Back to sign in
            </Link>
          </>
        ) : (
          <p className="mt-3 text-sm text-muted">Signing you in…</p>
        )}
      </div>
    </div>
  );
}
