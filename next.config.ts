import type { NextConfig } from "next";

// Security response headers applied to every route. See docs/LAUNCH-REVIEW.md §5.
// The app's only browser-facing external origin is Supabase (REST + realtime
// websocket + storage); fonts are self-hosted (geist package) and Resend is
// server-side only, so the connect/img allow-lists stay tight.
//
// Phase 1 CSP: scripts/styles allow 'unsafe-inline' because Next injects inline
// bootstrap without nonces; this still blocks framing, restricts connect/img/
// font origins and disables object/base hijacking. Tightening script-src to a
// nonce-based policy (via middleware) is a later hardening step.
const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  // Dev needs 'unsafe-eval' for React Fast Refresh; production does not.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data:",
  // Supabase REST + storage over https, realtime over wss; ws:/localhost in dev.
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co${isDev ? " ws://localhost:* http://localhost:*" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Force HTTPS for two years incl. subdomains (add `; preload` once you submit
  // the domain to hstspreload.org).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
