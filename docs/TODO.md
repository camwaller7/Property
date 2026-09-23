# Corvelle Property — Rolling To-Do

Two living lists, kept current as we work. `docs/ROADMAP.md` holds the full history of what's shipped; this file is just "what's left, by priority".

Legend: `[ ]` open · `[~]` in progress / waiting · `[x]` done · **(you)** dashboard/browser · **(build)** code (Claude) · **(test)** hands-on check

_Last updated: 2026-09-23_

---

## 🅰 TO DO NOW — make it fully usable for your 1-month live self-test
Goal: run your own properties (starting Eltham Ave, SA) through the whole flow for a month to shake out imperfections. Online billing/subscriptions are **not** required for this — you can mark rent paid manually — so Stripe subscriptions live on the pre-public list.

### Ship what's built
- [~] **(you)** Merge **PR #3 — Cost tracking** into `main`.
- [~] **(build/you)** After #3: I sync `main` into **PR #4 — Inspection checklist + condition photos**, then you merge it.

### Auth / sign-in (Section C tail)
- [~] **(you)** Fix Resend SMTP **sender → `noreply@corvelleproperty.com`** (gmail can't be a verified sender) so confirmation emails send.
- [ ] **(test)** Do a real sign-up on the live domain → tell me the email → **I verify the new isolated org** (live cross-org isolation check) to close Section C end-to-end.

### Manager ↔ tenant email (core to real use)
- [ ] **(you/build)** Turn on outbound email so the app can send onboarding links, notices, and **inspection reminders**. Decide: **Zapier Catch-Hook** (`ZAPIER_EMAIL_WEBHOOK_URL`) **or** switch app email to **Resend** (already verified). *If Resend, I do the (build) to point `/api/email` at Resend.*

### Prove the whole loop on a real property
- [ ] **(test)** End-to-end walkthrough on Eltham Ave: add property → create tenancy → send onboarding link → tenant submits → generate agreement/handbook → enable portal → log a maintenance matter (thread both sides) → schedule inspection + tenant reminder → log costs + receipt → upload condition photos → record rent + mark paid.
- [ ] **(build)** Fix anything that walkthrough surfaces (this is the point of the month).

### State correctness for where you operate
- [ ] **(you/build)** Verify **SA** bond cap, notice periods and tribunal/authority links in `src/lib/jurisdictions.ts` are current (your live state first; the rest before public).

### Optional during the test
- [ ] **(you)** Set `ANTHROPIC_API_KEY` if you want to trial the **AI assistant** (Pro feature) during the month.
- [ ] **(you/build)** Set up **Stripe Connect (Express)** only if you want to test *online rent collection* live; otherwise defer — manual "mark paid" is fine for the test.

---

## 🅱 TO DO BEFORE PUBLIC — hardening for real customers
Everything needed before other people create accounts and pay.

### Security & auth
- [ ] **(you)** Enable **leaked-password protection** (HaveIBeenPwned) in Supabase Auth → Passwords. *(May need Supabase Pro.)*
- [ ] **(you)** Email **confirmation ON** with working Resend SMTP (blocks fake/typo sign-ups).
- [ ] **(you)** Add **CAPTCHA / bot protection** on sign-up (Supabase Auth → Attack Protection).
- [ ] **(build/you)** Rate-limiting / abuse protection on public endpoints.
- [ ] **(you)** Supabase **Pro** for backups / PITR + remove any remaining advisor warnings (`pg_net` in public, function search_path).

### Billing (Section D — Stripe subscriptions)
- [ ] **(you)** Stripe account + create recurring **prices**: `STRIPE_PRICE_PLUS_MONTHLY` ($20), `_PLUS_ANNUAL` ($200), `_PRO_MONTHLY` ($45), `_PRO_ANNUAL` ($450).
- [ ] **(you)** Env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`; webhook endpoint with `checkout.session.completed`, `customer.subscription.updated/deleted`, `account.updated`.
- [ ] **(you)** Enable **Stripe Connect (Express)** for landlord rent payouts; test in live mode.
- [ ] **(test)** Full billing test: upgrade Free→Plus→Pro, tier gates flip, downgrade/lapse falls back to Free.

### Legal & compliance
- [ ] **(build/you)** Terms of Service + Privacy Policy pages; cookie/consent if needed.
- [ ] **(build)** Confirm "not legal advice" disclaimers on all generated tenancy docs/AI drafts.
- [ ] **(you)** GST handling/registration once turnover approaches A$75k; decide GST-inclusive pricing display.

### Content & correctness
- [ ] **(you/build)** Verify **all 8 states/territories'** bond caps, notice periods, tribunal + authority links against official sources.
- [ ] **(build)** Empty states, error states, and **mobile/responsive QA** across every page + the tenant portal.

### Growth & ops
- [ ] **(build)** Marketing / lead-capture site (public front to acquire clients).
- [ ] **(build)** Tenant **scheduled email reminders** (rent due) — server-side scheduled send (pg_cron/edge + email).
- [ ] **(build/you)** Error monitoring (e.g. Sentry) + uptime alerting.
- [ ] **(build/you)** Support channel + basic help docs for landlords and tenants.
- [ ] **(you)** `admin@corvelleproperty.com` mailbox live (MX) for inbound/support mail.

### Later product (not blocking public, but on the roadmap)
- [ ] **(build)** Development module (feasibility, stages, budgets, approvals).
- [ ] **(build)** Deeper investment analytics (cash-on-cash, gearing, portfolio trends).
- [ ] **(build)** Compliance schedule (recurring smoke-alarm/safety checks + reminders).
