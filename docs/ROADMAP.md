# Folio — Roadmap & Checklist

Legend: `[x]` done · `[ ]` to do · **(you)** = dashboard/browser action · **(build)** = code work for Claude

_Last updated: 2026-09-22_

---

## 1. Go-live configuration (you)

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

### 3a. Restructure subscription into three tiers
- [ ] **Free** — 1 property. Core: rent ledger, tenancy, onboarding, tenant portal. No document library.
- [ ] **Plus (mid)** — up to **3 properties** + **Document & forms library** (+ online rent, team, reminders).
- [ ] **Pro (max)** — **unlimited properties** + **AI assistant** (below). Everything in Plus.
- [ ] Implement: multiple Stripe prices + a `tier` on the org; gate property limit, documents,
      and the AI assistant by tier; update the Billing page with three plans.
- [ ] _Pricing per tier: **TBD by you.**_

### 3b. In-app AI assistant (Pro)
- [ ] Assistant with access to the org's own data (RLS-scoped) — properties, tenancies,
      applications, matters, documents.
- [ ] Can **fill out forms & templates** (agreement, condition report, notices, handbook)
      from the landlord + tenant information already captured.
- [ ] Chat/side-panel UI; actions produce editable, printable documents (never auto-send).
- [ ] Built on the Claude API (server-side key); strictly org-scoped so it can never read
      another account's data.
- [ ] Guardrails: drafts to review (not legal advice); confirm before any outward action.

## 4. Later growth (build)

- [ ] **Marketing / lead-capture site** (company front + client acquisition).
- [ ] **Renovations** module (projects, receipts, budgets, cost-vs-value).
- [ ] **Development** module (feasibility, stages, budgets, approvals).
- [ ] **Deeper investment analytics** (cash-on-cash, gearing status, portfolio trends).
- [ ] **Tenant scheduled email reminders** (rent due to tenants) — needs a server-side
      scheduled send (pg_net/edge function + the email webhook).
- [ ] **Compliance schedule** (recurring smoke-alarm checks, reminders).

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
