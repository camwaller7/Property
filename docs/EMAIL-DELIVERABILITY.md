# Email deliverability — keep mail out of junk

App email (onboarding links, notices, inspection reminders, document sends) goes
out through **Resend** from `noreply@corvelleproperty.com`. If mail lands in
**junk/spam**, the cause is almost always that the sending domain isn't
authenticated (SPF/DKIM/DMARC). Fix it once at the DNS level.

> The exact DKIM key and AWS region below are **unique to your domain** — copy
> the values Resend shows you, not the placeholders here.

## 1. Verify the domain in Resend
Resend → **Domains** → **Add Domain** → `corvelleproperty.com`. Resend lists the
records to add. Add them at **GoDaddy → your domain → DNS → Add record**
(GoDaddy appends the domain, so enter the host **without** the suffix — e.g.
`send`, not `send.corvelleproperty.com`):

| Type | Host | Value | Purpose |
|------|------|-------|---------|
| TXT  | `send` | `v=spf1 include:amazonses.com ~all` | SPF |
| MX   | `send` | `feedback-smtp.us-east-1.amazonses.com` (priority 10) | bounce feedback (region may differ) |
| TXT  | `resend._domainkey` | `p=MIGf…` (long key from Resend) | **DKIM** — the important one |

Click **Verify** in Resend once DNS propagates (minutes–hours).

## 2. Add DMARC
This is what most strongly stops junk-foldering. GoDaddy → Add record:

| Type | Host | Value |
|------|------|-------|
| TXT  | `_dmarc` | `v=DMARC1; p=none; rua=mailto:admin@corvelleproperty.com; adkim=r; aspf=r` |

Start at `p=none` to monitor; tighten to `p=quarantine` later once mail is
landing well.

## 3. Sender checks
- **App email** already sends **From `noreply@corvelleproperty.com`** (matches the
  verified domain) with a `Reply-To` of `admin@corvelleproperty.com`
  (override with `EMAIL_REPLY_TO`). Leave the From as-is.
- **Supabase Auth → SMTP** (sign-up confirmation / password reset) must **also**
  send from `noreply@corvelleproperty.com`, not a gmail address — a gmail sender
  is what caused the earlier "Error sending confirmation email".

## 4. Test
After verification, send a test (e.g. "Email tenant" from a lease, or a
confirmation sign-up) to a Gmail and an Outlook address. Both should land in the
inbox. Check the message headers show `spf=pass`, `dkim=pass`, `dmarc=pass`.

## Env vars (Vercel)
- `RESEND_SECRET` — Resend API key (already set).
- `EMAIL_FROM` — optional; defaults to `noreply@corvelleproperty.com`.
- `EMAIL_REPLY_TO` — optional; defaults to `admin@corvelleproperty.com`.
