# Corvelle Property — Roadmap & Checklist

Legend: `[x]` done · `[ ]` to do · **(you)** = dashboard/browser action · **(build)** = code work for Claude

_Last updated: 2026-09-22_

---

## 1. Go-live configuration (you)

- [ ] **Point the domain at Vercel** — `corvelleproperty.com` (bought via GoDaddy).
      Vercel → project → Settings → Domains → add `corvelleproperty.com` **and**
      `www.corvelleproperty.com`; then in GoDaddy DNS set the records Vercel shows
      (apex A `76.76.21.21` or the ALIAS/ANAME Vercel gives, and `www` CNAME
      `cname.vercel-dns.com`). See docs/SETUP.md Task 6.
- [ ] **Set up email on the domain** — `admin@corvelleproperty.com`. Choose a
      mailbox host (Google Workspace / Microsoft 365 / GoDaddy email) and add its
      **MX** records in GoDaddy. For app *sending*, verify the domain in Resend and
      add its SPF/DKIM records. See docs/SETUP.md Task 6.
- [ ] **Enable public sign-ups** — Supabase → Authentication → Sign In / Providers →
      "Allow new users to sign up" **ON**. *(A sign-up was just blocked because this is off.)*
- [ ] **Decide email confirmation** — Auth → Email → "Confirm email" on (secure, needs
      SMTP for volume) or off (instant sign-in for testing).
- [ ] **Enable leaked-password protection** — Auth → Passwords (HaveIBeenPwned).
- [ ] **Email sending** — create the Zapier Catch-Hook → Gmail Zap and set
      `ZAPIER_EMAIL_WEBHOOK_URL` in Vercel (SETUP Task 2).
- [ ] **Stripe** — add `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`(s), `STRIPE_WEBHOOK_SECRET`,
      `SUPABASE_SERVICE_ROLE_KEY`; enable **Connect (Express)**; add webhook events
      `checkout.session.completed`, `account.updated` (SETUP Task 5).
- [ ] **Vercel** — confirm env vars set and production branch is the deployed branch.
- [ ] Optionally drop the unused `notify_manager` DB function (already locked down).

## 2. Verification & testing

- [ ] **End-to-end walkthrough** (SETUP Task 3): property → tenancy → onboarding link →
      portal → maintenance thread → rent mark-paid.
- [ ] **Tenant portal test** (rent, requests/thread sync, notices, documents).
- [ ] **Verify state data** — confirm each state's authority/bond/tribunal links and bond
      caps/notice periods in `src/lib/jurisdictions.ts` against official sources.
- [ ] **Online rent test** (Stripe test mode) once Connect is enabled.

## 3. New work requested (build)

### 3a. Restructure subscription into three tiers ✅ (code done — Stripe prices pending)
- [x] **Free** — 1 property. Core: rent ledger, tenancy, onboarding, tenant portal. No document library.
- [x] **Plus (mid)** — up to **3 properties** + **Document & forms library** (+ online rent, team, reminders). **$20/mo · $200/yr**
- [x] **Pro (max)** — **unlimited properties** + **AI assistant** (below). Everything in Plus. **$45/mo · $450/yr**
- [x] Implemented: per-tier gating (`activePlan`/`hasDocuments`/`hasAI`), tier carried in Stripe
      metadata, Billing page rebuilt with 3 plans + monthly/annual toggle.
- [ ] **(you)** Create the Stripe products/prices and set `STRIPE_PRICE_{PLUS,PRO}_{MONTHLY,ANNUAL}` (SETUP Task 5).
- [x] Pricing set from the market + cost analysis (Free / $20 / $45). See §5.

### 3b. In-app AI assistant (Pro) ✅ (code done — API key pending)
- [x] Assistant with access to the org's own data (RLS-scoped via the caller's token) —
      properties, tenancies, submitted applications, matters, notices.
- [x] Can **draft/fill forms & templates** (agreement, condition report, notices, handbook)
      from the landlord + tenant information already captured.
- [x] Chat UI at `/app/assistant` (new nav item); produces editable Markdown drafts, never auto-sends.
- [x] Built on the Claude API (server-side key at `/api/assistant`); strictly org-scoped so it
      can never read another account's data. Pro-gated via `hasAI`.
- [x] Guardrails baked into the system prompt: drafts to review (not legal advice), state-aware
      assumptions flagged, no outward actions.
- [ ] **(you)** Set `ANTHROPIC_API_KEY` in Vercel to switch it on. Optional `ANTHROPIC_MODEL`
      (defaults to `claude-opus-5`; set `claude-sonnet-5` for ~5× lower cost per the §5 analysis).

## 4. Later growth (build)

- [ ] **Marketing / lead-capture site** (company front + client acquisition).
- [ ] **Renovations** module (projects, receipts, budgets, cost-vs-value).
- [ ] **Development** module (feasibility, stages, budgets, approvals).
- [ ] **Deeper investment analytics** (cash-on-cash, gearing status, portfolio trends).
- [ ] **Tenant scheduled email reminders** (rent due to tenants) — needs a server-side
      scheduled send (pg_net/edge function + the email webhook).
- [ ] **Compliance schedule** (recurring smoke-alarm checks, reminders).

---

## 5. Pricing & unit economics

**Tiers (AUD, GST-inclusive suggested):** Free $0 (1 property) · **Plus $20/mo or
$200/yr** (≤3 properties + document library + online rent + team) · **Pro $45/mo or
$450/yr** (unlimited + AI assistant).

**Stack cost to run (USD, ≈1.5 AUD):** fixed baseline ~$45–50/mo (Supabase Pro $25,
Vercel Pro $20, Resend free to 3k emails). Variable: Stripe 1.7% + $0.30 + 0.5%
Billing on your subs; Anthropic AI assistant ~$0.07–0.10 per form-fill (Sonnet 5),
~$3–5/mo even for a heavy Pro user. **Break-even ≈ 4 Plus or 2 Pro subscribers.**

**Positioning:** RentBetter charges ~$36/property; managed agents (:Different, Cubbi)
take ~6–10% of rent. Flat-tier Plus at ~$6.50/property massively undercuts per-property
pricing; Pro's AI assistant is a differentiator no AU competitor offers. FX note: ~65%
of costs are USD vs 100% AUD revenue — annual pre-pay hedges this.

---

## Done so far

- [x] Next.js app + Apple-style brand landing; public sign-up section.
- [x] Workspace: dashboard (needs-attention), properties + gearing, rent ledger.
- [x] Supabase Auth — password, magic link, password reset, `/auth/callback`.
- [x] Multi-tenant isolation — org-scoped RLS on all tables **and** storage; hardened
      SECURITY DEFINER grants (verified server-side).
- [x] Teams — organizations, roles (owner/admin/member), invite links.
- [x] Tenant onboarding — gated form, document uploads, prefilled agreement + handbook.
- [x] Tenant portal — rent, lease/bond, notices, documents, contact.
- [x] Matters — two-way threads, resolution phases (tenant ↔ manager sync).
- [x] Notifications — in-app feed, event alerts, daily reminders (pg_cron).
- [x] Rent automation — auto schedule, auto-overdue, one-click paid, reconcile hook.
- [x] Online rent via **Stripe Connect** (landlords collect their own rent).
- [x] Documents & forms library + AU-wide state jurisdictions.
- [x] Billing scaffolding (Stripe subscriptions).
- [x] **Rebrand to Corvelle Property** (corvelleproperty.com) — central `brand.ts`
      drives the whole app; email/landing/portal/docs updated.
- [x] **Three-tier subscription** (Free / Plus $20 / Pro $45) with per-tier feature
      gating and a monthly/annual billing toggle.
- [x] Management — outstanding tasks & requests register (raise repairs + any other
      matter, due dates, open/all filter, status threads).
- [x] Management — per-property calendar (month grid + upcoming agenda: rent due,
      inspections, lease start/end, move-ins, notices, task due dates).
- [x] Login — password sign-in now persists (proper `<form>` + autocomplete so the
      browser saves/fills credentials); stronger password policy (10+ chars, upper,
      lower, number) on sign-up and reset with an on-screen hint.
