# Corvelle Property — Browser Checklist (things only you can do)

Everything below happens in a **dashboard/browser** — it can't be done from the
code side. Ordered by priority. Full step-by-step for each is in `docs/SETUP.md`;
this is the tracking list. `env` = add the variable in **Vercel → Project →
Settings → Environment Variables**, then **redeploy**.

Legend: `[ ]` to do · `[x]` done · `[~]` in progress

---

## A. Repo & deploy workflow
- [x] Create `main` branch (done in-session).
- [ ] **GitHub → Settings → General → Default branch** → switch to `main`.
- [ ] **Vercel → property → Settings → Git → Production Branch** → set to `main`.
- [ ] Review + **merge PR #1** (AI assistant + CI) into `main`.
      https://github.com/camwaller7/Property/pull/1

## B. Domain & email (corvelleproperty.com)
- [x] Attach domain + `www` to the Vercel project (done in-session).
- [x] GoDaddy DNS: `A @ → 76.76.21.21`, `CNAME www → cname.vercel-dns.com`, no forwarding.
- [~] Wait for DNS propagation, then confirm `https://corvelleproperty.com` serves the
      site (check dnschecker.org for `76.76.21.21`; open in a private window).
- [ ] **Email inbox** for `admin@corvelleproperty.com`: pick a host (GoDaddy email /
      Google Workspace / Microsoft 365), create the mailbox, add its **MX** records in GoDaddy.
- [ ] **App email sending**: verify `corvelleproperty.com` in Resend, add its **SPF/DKIM**
      records in GoDaddy. *(Independent of MX — both coexist.)*

## C. Supabase (Authentication)
- [ ] **URL Configuration → Site URL** = `https://corvelleproperty.com`; add
      `https://corvelleproperty.com/**` to the Redirect URLs allowlist.
- [ ] **Providers → "Allow new users to sign up" = ON** (public sign-ups; currently blocked).
- [ ] Decide **"Confirm email"** on/off (on = secure, needs SMTP for volume).
- [ ] Enable **Leaked-password protection** (Auth → Passwords).

## D. Stripe — subscriptions (3 tiers)
- [ ] Create recurring **prices** and set each env:
  - [ ] `STRIPE_PRICE_PLUS_MONTHLY`  (Plus, $20/mo)
  - [ ] `STRIPE_PRICE_PLUS_ANNUAL`   (Plus, $200/yr)
  - [ ] `STRIPE_PRICE_PRO_MONTHLY`   (Pro, $45/mo)
  - [ ] `STRIPE_PRICE_PRO_ANNUAL`    (Pro, $450/yr)
- [ ] `STRIPE_SECRET_KEY` (env)
- [ ] Webhook endpoint `https://corvelleproperty.com/api/billing/webhook` with events
      `checkout.session.completed`, `customer.subscription.updated`,
      `customer.subscription.deleted`, `account.updated` → `STRIPE_WEBHOOK_SECRET` (env)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (env — server-only, used only by the webhook)

## E. Stripe — rent collection (Connect)
- [ ] Enable **Connect (Express)** in Stripe.
- [ ] In-app: **Billing → Connect Stripe** → complete Express onboarding → tick
      **Accept rent payments online**.

## F. Email sending (manager emails)
- [ ] Create the **Zapier Catch-Hook → Gmail** Zap → `ZAPIER_EMAIL_WEBHOOK_URL` (env).
      *(Or switch this to Resend once the domain is verified in section B.)*

## G. AI assistant (Pro)
- [ ] `ANTHROPIC_API_KEY` (env) — switches the assistant on.
- [ ] *(optional)* `ANTHROPIC_MODEL` — defaults to `claude-sonnet-5`; set
      `claude-opus-5` for higher-quality drafting at higher cost.

## H. Final checks
- [ ] Confirm all env vars are set in Vercel and **redeploy**.
- [ ] End-to-end walkthrough: sign up → add property → tenancy → onboarding link →
      tenant portal → matter thread → mark rent paid → upgrade a plan (Stripe test mode) →
      ask the AI assistant to draft a document.
- [ ] Verify each state's authority/bond/tribunal links and figures in the Documents library.
