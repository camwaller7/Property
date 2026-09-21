"use client";

import { useEffect } from "react";

// Supabase can land an auth redirect on the site's home page (e.g. it falls
// back to the Site URL). The home/marketing pages don't initialise the Supabase
// client, so the token in the URL would never be consumed. This runs on every
// page and, if it sees an auth token/code, forwards to /auth/callback (which
// hydrates the session), preserving the query string and hash.
export default function AuthUrlForwarder() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.pathname.startsWith("/auth/")) return;
    const hash = window.location.hash;
    const search = window.location.search;
    const hasHashToken = hash.includes("access_token=") || hash.includes("error=") || hash.includes("type=recovery");
    const hasCode = new URLSearchParams(search).has("code");
    if (hasHashToken || hasCode) {
      window.location.replace(`/auth/callback${search}${hash}`);
    }
  }, []);

  return null;
}
