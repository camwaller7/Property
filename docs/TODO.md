# Corvelle Property — Rolling To-Do

Two living lists, kept current as we work. `docs/ROADMAP.md` holds the full history of what's shipped; this file is just "what's left, by priority".

Legend: `[ ]` open · `[~]` in progress / waiting · `[x]` done · **(you)** dashboard/browser · **(build)** code (Claude) · **(test)** hands-on check

_Last updated: 2026-09-24_

---

## 🅰 TO DO NOW — make it fully usable for your 1-month live self-test
Goal: run your own properties (starting Eltham Ave, SA) through the whole flow for a month to shake out imperfections. Online billing/subscriptions are **not** required for this — you can mark rent paid manually — so Stripe subscriptions live on the pre-public list.

### Ship what's built
- [x] **PR #3 — Cost tracking**, **PR #4 — Inspection checklist + condition photos**, **PR #5 — rolling TODO** and **PR #6 — Resend email** all merged to `main`.

### Management rework (raised while adding a real tenant) — staged
- [x] **(build)** **PR 1** — richer per-person **emergency contact** (name, relationship, phone) + **multiple people under one lease**. New org-scoped `lease_tenants` table; the primary person's contact mirrors onto the tenancy row so the portal/applications/emails keep working; manager emails **fan out to everyone on the lease**; private `tenant-documents` bucket provisioned for per-person IDs.
- [x] **(build)** **PR 2** — Management **Dashboard** tab: clickable event calendar (click a day → what's due) + info tiles (urgent & outstanding, maintenance requests, inspections due 30d, lease expiries 30d). Separate **Tenants** tab with at-a-glance critical flags (rent overdue/soon, urgent/open maintenance), opening a full **lease detail view** (per-person ID/documents via the private `tenant-documents` bucket, contact + emergency, move-in checklist, onboarding/portal links, inspections, condition photos, inspection checklist).

### Testing fixes (raised during live testing) — staged
- [x] **(build)** **PR A** — **auto-schedule quarterly routine inspections** from lease start (first at +3 months, on the nearest weekday); **reminder markers 1 month / 2 weeks / 3 days** before each, shown in both the management calendar and the tenant portal. **Onboarding notice** telling applicants a contract to sign follows review. **Send documents to tenant**: upload the official/signed contract or the property handbook (PDF) from the lease detail → appears in the tenant portal + emails everyone on the lease.
- [x] **(build)** **PR C** — **tenant accounts + dual login**. Landing page now has **Property manager login** (`/app`) and **Tenant login** (`/tenant`). The portal link a manager sends is now a **create-account** page (`/tenant/claim/<token>`); the signup is linked to the tenancy (role-aware `handle_new_user`, new `tenant_portal_users` table) so tenants sign in from the landing page and land in their portal. Also added `Reply-To` to app email.
- [~] **(you)** **Email deliverability** (mail landing in junk): verify `corvelleproperty.com` in Resend + add **SPF / DKIM / DMARC** DNS at GoDaddy — full steps in `docs/EMAIL-DELIVERABILITY.md`.
- [x] **(build)** **PR B (cron)** — **automatic reminder sending**: `vercel.json` runs `/api/cron/reminders` daily (21:00 UTC ≈ 7:30am Adelaide); it emails everyone on the lease 30 / 14 / 3 days before each scheduled inspection, de-duped via `inspection_reminders_sent`.
- [ ] **(you)** Set **`CRON_SECRET`** (any long random string) and **`SUPABASE_SERVICE_ROLE_KEY`** in Vercel env so the reminder cron can run and send. (Vercel Cron sends the `CRON_SECRET` automatically; the endpoint 401s without it.)

### Recurring bills & calendar
- [x] **(build)** **Council rates / water / other recurring bills** per property (amount, cycle, next-due, payer) on the Cost tracking page — auto-projected into the Management **calendar** and a new **"Rates & bills due (30 days)"** dashboard tile. Council rates are landlord-only; **water/tenant-recoverable bills** have a **"Send to tenant"** action that posts a portal notice. Landlord-only data — never shown in the tenant portal.
- [x] **(build)** Calendar list below the grid is now a **2-week snapshot** ("Next 2 weeks") instead of a flat list.

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
