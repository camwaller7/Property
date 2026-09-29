# Launch Review — action reference (from the "vibe coding" reel notes)

**Source:** the user's `Instagram_Reel_Notes.docx` (forwarded reels on shipping a
SaaS safely and professionally), reviewed 2026-09-29.
**Purpose:** a durable reference for every item raised, with a plain-English
explanation, a real example, **where Corvelle Property stands today**, and the
concrete action. Work items are mirrored into `docs/TODO.md`; this file is the
detail behind them.

**Status legend:** ✅ done · 🟡 partial / needs review · ❌ not started ·
➖ not applicable yet. Status reflects the app as built; confirm before relying
on it. **None of this is legal advice** — the legal items in particular should
be confirmed with a solicitor or a generator like Termly/iubenda.

---

## 1. Legal & policy documents

The reels stress that a real product needs real, accurate policies — and that
the fastest safe route is a reputable generator (Termly, iubenda) rather than
copy-paste.

| Item | What it means / real example | Status | Action |
|---|---|---|---|
| **Privacy policy** | Must describe what you *actually* collect (names, emails, tenancy data, payment metadata) and why. Example: a policy that claims "we don't share data" while loading Google Analytics is a false statement regulators act on. | 🟡 `/legal/privacy` exists | Rewrite from the app's real data flows (Supabase, Resend, Stripe, Vercel). Consider Termly/iubenda to generate, then edit to match. |
| **Terms of service** | The contract for using the software. | 🟡 `/legal/terms` exists | Same — align to actual behaviour. |
| **Limitation of liability** | Caps your exposure. Example wording: "In no event shall Corvelle Property be liable for damages exceeding the amount paid in the preceding 12 months." | ❌ | Add clause to ToS. |
| **Governing law** | Names the jurisdiction (e.g. South Australia, Australia) whose law governs disputes. | ❌ | Add clause to ToS. |
| **Indemnification** | Users agree to hold you harmless for claims arising from *their* use (e.g. a landlord misusing the generated lease). | ❌ | Add clause to ToS. |
| **Data deletion policy** | How and when user data is deleted on request/closure. Ties to GDPR/APP + Apple's deletion rule. | ❌ | Document it + build the self-serve request (see §4/§5). |
| **Refund policy** | Clear terms for subscription refunds. Example: "Monthly plans are non-refundable; annual plans refundable pro-rata within 14 days." | ❌ | Add once billing is live. |
| **Cookie policy + consent banner** | Required where you set non-essential cookies/analytics. Example: PostHog session replay is non-essential and needs consent in many jurisdictions. | ❌ | Add a banner + policy **before** adding analytics (§10). If we stay essential-cookies-only, a short disclosure may suffice — confirm. |
| **Policy matches reality** | The #1 legal failure is a policy that doesn't match the app. | 🟡 | Cross-check every policy claim against the real data map. |
| **Business details** | Show a legal entity name, ABN and contact. Builds trust and is required by consumer law/Apple. | ❌ | Add to footer + ToS once the entity/ABN is set (YOU). |

---

## 2. Marketplace trust & integrity

| Item | What it means / real example | Status | Action |
|---|---|---|---|
| **No dark patterns** | No tricking users into actions (pre-ticked upsells, confusing cancel flows). | ✅ keep clean | Keep cancel/downgrade as easy as upgrade. |
| **No hidden fees** | All costs shown before payment. | ✅ | Ensure the pricing page states GST treatment + any per-seat costs upfront. |
| **No fake reviews** | Never fabricate testimonials — illegal (ACCC) and an Apple rejection. | ✅ | Only use real, attributable reviews (§6). |
| **No unsupported claims** | Don't claim "bank-level security" or savings you can't prove. | 🟡 | Audit landing-page copy for provable claims only. |
| **DMCA / takedown policy** | A stated process + a dedicated email (e.g. `takedown@corvelleproperty.com`) for copyright/abuse reports. | ❌ | Add a short policy page + mailbox (YOU: mailbox). |
| **"Preferred sources" badge** | A trust signal some directories/search surfaces offer to verified sources. | ➖ later | Revisit post-launch as an SEO/trust task. |

---

## 3. Accessibility (WCAG basics)

| Item | Real example | Status | Action |
|---|---|---|---|
| **Alt text** | Every meaningful image needs a text alternative for screen readers. | 🟡 | Audit; our uploaded photos use generic alt — add descriptive alt where content-bearing. |
| **Colour contrast** | Body text should meet ~4.5:1. Example failure: light-grey `text-muted` on white for essential text. | 🟡 | Run a contrast check on `--muted`, badges, disabled states. |
| **Keyboard navigation** | Every action reachable + visible focus ring, no mouse-only controls. | 🟡 | Test tab order on forms, modals, the paywall; ensure focus styles. |

Overlaps BUILD task **#55 (mobile + empty/error-state QA)** — fold accessibility
into that pass.

---

## 4. Privacy & data hygiene

| Item | What it means / real example | Status | Action |
|---|---|---|---|
| **Collect no unnecessary data** | Only fields you use. Example: don't collect DOB unless a rule needs it. | 🟡 | Review each form field against a real need. |
| **Audit third-party SDKs** | Every embedded SDK can exfiltrate data. Example: an analytics SDK sending PII. | 🟡 | Keep the dependency list lean; document each SDK's data access before adding (PostHog, Sentry, Stripe). |
| **Age consent for kids' data** | Only if you knowingly collect data from under-16s. | ➖ | N/A — B2B landlord/tenant tool. Note "not for under-18s" in ToS. |
| **Unsubscribe link in emails** | Legally required for non-transactional email (Spam Act 2003 AU). Example: a reminder blast with no opt-out is a breach. | ❌ | Add an unsubscribe/preference link + sender business address to non-transactional emails (Resend). Transactional emails (a specific tenant's inspection notice) are exempt but should still identify the sender. |
| **License fonts/images** | Use only licensed assets. Example: a hero image lifted from Google Images is infringement. | ✅ | Geist font is licensed; we ship no stock imagery. Keep it that way. |
| **Data deletion request** | Users can request full deletion. | ❌ | Build a self-serve "delete my account/data" request (manager) + a tenant data path; document retention. |

---

## 5. Security hardening

Much of this is already in place from the security pass (PR #19). Table shows
real state.

| Item | Real example / why | Status | Action |
|---|---|---|---|
| **Hide API keys** | Never ship secret keys in the client bundle. | ✅ | Only the Supabase **anon/publishable** key + public URL are client-side; service-role & Resend keys are server env only. |
| **Use the public DB key client-side** | The anon key is *designed* to be public **because RLS enforces access.** | ✅ | In place. |
| **Enable Row-Level Security** | Without RLS the anon key reads everything. | ✅ | RLS on all org tables via `org_id in (my_org_ids())`; portal via token-scoped RPCs. |
| **Purge git secrets** | A committed `.env` is scraped within minutes. | 🟡 | Confirm no secret ever committed (scan history); rotate anything found. (YOU/BUILD) |
| **Encrypt sensitive data** | At-rest + in-transit. | 🟡 | Supabase encrypts at rest; HTTPS in transit. App-level field encryption not needed for current data — revisit if we store IDs/bank details. |
| **Enforce server-side auth** | Never trust the client for authorization. | ✅ | RLS + SECURITY DEFINER RPCs enforce server-side; portal RPCs are token-guarded. |
| **Admin checks server-side (not client)** | Example failure: hiding an "admin" button in the UI but leaving the API open. | ✅ | Roles live in `org_members`; RLS enforces, UI only reflects. |
| **Lock record access** | One user must never read another org's rows. | ✅ | RLS; verified live during the isolation review. Close with the live sign-up test (#51). |
| **Hash passwords** | Never store plaintext. | ✅ | Supabase Auth (bcrypt/scrypt). |
| **Secure session cookies / not localStorage** | Session tokens in `localStorage` are readable by any XSS. | 🟡 | Supabase JS persists the session in `localStorage` by default. Mitigations: strong Content-Security-Policy (below), React's auto-escaping, the 4-hour inactivity logout. Consider the cookie-based `@supabase/ssr` flow before public launch. |
| **Rate-limit login** | Stop credential stuffing. | 🟡 | Token/session gating done; add numeric per-IP/per-account login throttling. |
| **Add bot protection** | CAPTCHA on sign-up. | ❌ | hCaptcha/Turnstile — **YOU** create keys; then wire the site key into the sign-up form (small build task). |
| **Parameterize queries** | Prevent SQL injection. | ✅ | All DB access via the Supabase client / parameterized RPCs; no string-built SQL from the client. |
| **Validate all inputs** | Server-side, not just client. | 🟡 | Client validation exists; RPCs validate key inputs. Add server-side checks on any new write paths. |
| **Escape user content** | Prevent stored XSS. | ✅ | React escapes by default; we render no `dangerouslySetInnerHTML`. |
| **Restrict file uploads** | Only accept types you need. Example: block `.svg`/`.html` (script-carrying) and cap size. | ✅ | Buckets enforce `image/*` (+PDF for docs) and 10–20 MB caps (security pass). |
| **Trim API responses** | Don't return more than the client needs. | 🟡 | `portal_get` returns curated fields (good). Keep new endpoints minimal. |
| **Add security headers** | CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy. Example: no `X-Frame-Options` → clickjacking. | ❌ | **Add a headers block in `next.config.ts`.** High priority, quick win. |
| **Force HTTPS** | No plaintext. | ✅ | Vercel serves HTTPS; add HSTS via the headers block above. |
| **Scan dependencies** | Catch known CVEs. | ❌ | Add `npm audit` (or Dependabot) to CI. |
| **2FA / OTP** | Second factor for managers. | ❌ | Supabase MFA (TOTP) — schedule before public. |
| **Email/action rate limits** | "Emails per day, requests per user per minute, uploads per account" to prevent abuse. | 🟡 | `/api/email` is now authorized; add numeric quotas (emails/day, writes/min, uploads/account). |
| **Session expiry on close + inactivity** | Re-auth after the browser is closed or idle. | ✅ | 4-hour inactivity auto-logout shipped. |

---

## 6. Payment & paywall UX

These are conversion techniques for the pricing/paywall screens (apply when
billing goes live — `/app/billing`, `lib/plans.ts`).

| Technique | Real example | Action |
|---|---|---|
| **Annual = the green (primary) button, with a discount** | Annual shown as the recommended CTA; monthly secondary. | Make annual the highlighted option with e.g. "2 months free". |
| **Free trial only on annual** | Trial reserved for annual to bias toward the higher-LTV plan. | Gate the trial to annual sign-ups. |
| **Lead with the hook, not the price** | Headline = the outcome ("Never miss a rent payment or inspection again"), price lower down. | Restructure pricing hero: outcome headline + sub-line, price after. |
| **Show estimated savings before the price** | "Saves you ~X hours / $Y a year" with a scroll transition into the price. | Add a value/savings estimate per tier above the number. |
| **"Sell the treehouse, not the drill"** | Sell the result, not the feature. Instead of "cost tracking", say "see every dollar and its GST at tax time in one export". | Rewrite feature lines as outcomes. |
| **Per-line standalone cost** | Next to each included feature, show what it'd cost separately (anchoring). | Add "worth $X on its own" annotations. |
| **Reviews with reviewer photos** | Real, attributed testimonials with faces build trust. | Collect real reviews post-beta; never fabricate (§2). |
| **Split the paywall into 3 scrollable screens** | More room to sell; feels premium. | Multi-step paywall: problem → proof → plans. |
| **The payment screen is the most beautiful, friendly screen** | The moment of payment should feel polished and reassuring. | Invest design effort in the checkout screen specifically. |

---

## 7. Design — anti-patterns to avoid ("don't look vibe-coded")

Audit the landing page and portals against this list; each is a tell of a
generic AI-generated site. **Avoid:**

- Purple→blue gradients; gradient hero text; grain-over-gradient
- Emojis in headings; badge above the headline
- Inter font everywhere; Space Grotesk + Instrument Serif combo; serif-italic accents
- Coloured-border cards; glassmorphism cards; low-contrast dark mode
- Three-icon-boxes-in-a-row; Lucide icons everywhere; untouched shadcn defaults
- Fade-in-on-scroll; cursor-following beam; buttons that fade on hover
- Inconsistent spacing; em-dashes everywhere; generic buzzword copy

**Action:** a design pass on the public site + portals against this checklist,
paired with §8 tools/skills. (Corvelle already uses the Geist font and a
restrained palette — good — but re-check for these tells.)

---

## 8. Design — tools & skills to adopt

Referenced in the notes (verify each before relying on it):

- **styles.refero.design** — real-product UI reference gallery for inspiration.
- **shadegradient.co** — gradient generator (use sparingly given §7).
- **manus.im/app** — Manus AI agent, referenced as a design/build aid.
- **Emil Kowalski design skill** / **"impeccable design" skill** / **"taste" skill** — Claude skills the user wants installed to raise design quality. *(Setup: add via the skills marketplace; contents not verified here.)*
- **Connect Claude to the Figma MCP** — design-to-code / code-to-design bridge (this session already has Figma MCP tools available).
- **Logo reveal on load** — an intro animation when the site, the tenant portal and the management portal open. (Existing TODO **#63**.)

**Action (YOU/setup):** install the design skills, connect Figma; then a design
pass (§7) and the logo reveal (#63).

---

## 9. Apple App Store (only if/when we ship an iOS app)

Corvelle Property is a **web app today**, so these are ➖ N/A now — but they are
the exact reasons apps get rejected, so keep them in mind before any iOS wrapper.

- **In-app purchase (Guideline 3.1.1):** digital subscriptions sold inside an
  iOS app generally **must** use Apple IAP (Apple takes its cut), not Stripe.
  Reader/management apps can let existing users manage accounts and (in the US,
  post-2025 Epic ruling) link out to web purchase; outside the US the IAP rule
  still bites. **Implication:** keep Stripe for web; plan for IAP if we go iOS.
- **Sign in with Apple:** if you offer *any* third-party login, you must offer
  Sign in with Apple as an equal option.
- **Account deletion in-app:** if users can create an account, they must be able
  to **delete** it in-app. Common 2025 rejection: deletion works for the primary
  login but **breaks for Sign-in-with-Apple users** — the reviewer tests exactly
  that path.
- **Other frequent rejections to avoid:** broken demo/login for the reviewer,
  "website-in-a-box" (a thin web wrapper with no native value), broken iPad UI,
  outdated screenshots, "coming soon" screens, broken links, a required **report
  / block** feature for any user content, broken **restore purchases**, and
  screenshots showing paid features as if free.

---

## 10. Software stack (the notes' recommended stack vs. ours)

| Tool | Purpose (per notes) | Corvelle status |
|---|---|---|
| **Supabase** | Database + Auth | ✅ in use |
| **Claude Code** | Building | ✅ (this) |
| **Vercel** | Front end / hosting | ✅ in use |
| **Railway** | Back end | ➖ not needed — we're serverless on Vercel + Supabase |
| **Stripe** | Payments | 🟡 planned (keys = YOU) |
| **ElevenLabs** | Voice AI | ➖ only if we add voice |
| **Twilio** | Phone lines / SMS | ➖ possible fit for the future messaging assistant (SMS channel) |
| **Sentry** | Error/bug catching | ❌ planned (DSN = YOU) |
| **PostHog** | Session replay / analytics | ❌ optional; needs cookie consent (§1) before adding |

---

## 11. Pre-launch operational (YOU)

- **Cyber liability insurance** — you hold tenant/landlord PII; get a quote before
  taking real customers.
- **Read every stack's Terms of Service** — Supabase, Vercel, Stripe, Resend,
  and any analytics — and understand data-processing/subprocessor obligations
  (feeds the privacy policy in §1).

---

## Priority rollup (mirrored into docs/TODO.md)

**Do before the 1-month self-test (cheap, high-value):**
1. Security headers block in `next.config.ts` (§5) — BUILD.
2. hCaptcha on sign-up (§5) — YOU keys → BUILD wiring.
3. Confirm no secrets in git history (§5) — BUILD/YOU.

**Before public customers:**
4. Legal pack: liability, governing law, indemnification, data-deletion, refund,
   cookie policy + consent banner; make policies match reality; business details
   (§1) — BUILD + YOU.
5. Self-serve account/data deletion (§4/§5) — BUILD.
6. Unsubscribe link + sender address on non-transactional emails (§4) — BUILD.
7. Dependency scanning in CI; numeric rate limits; 2FA/OTP (§5) — BUILD.
8. Accessibility pass folded into #55 (§3) — BUILD.
9. Paywall UX revamp (§6) — BUILD, when billing is live.
10. Design pass vs. anti-patterns + skills/Figma + logo reveal (§7/§8, #63) — BUILD + setup.
11. Cyber insurance; read stacks' ToS (§11) — YOU.

**Future / conditional:**
- Apple App Store items (§9) — only if we ship iOS.
- Sentry, PostHog, Twilio/ElevenLabs (§10) — as those features arrive.
