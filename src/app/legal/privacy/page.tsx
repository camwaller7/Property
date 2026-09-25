import Link from "next/link";
import { brand } from "@/lib/brand";

export const metadata = {
  title: `Privacy Policy — ${brand.full}`,
};

// Draft Privacy Policy aligned to the Australian Privacy Principles (APPs).
// Placeholders in [brackets] must be completed and the document reviewed by an
// Australian lawyer before public launch.
export default function PrivacyPage() {
  return (
    <Legal title="Privacy Policy" updated="24 September 2026">
      <p>
        This Privacy Policy explains how [legal entity name] (ABN [ABN]) (&quot;we&quot;, &quot;us&quot;)
        handles personal information when you use {brand.full} (the &quot;Service&quot;). We handle
        personal information in accordance with the Privacy Act 1988 (Cth) and the Australian Privacy
        Principles (APPs).
      </p>

      <H>1. What we collect</H>
      <p>
        Account details (name, email, password hash); property and tenancy records you enter;
        documents you upload (including tenant identification and application material); maintenance
        and payment records; and technical data such as log and device information needed to run and
        secure the Service.
      </p>

      <H>2. How we use it</H>
      <p>
        To provide and operate the Service, authenticate users, send transactional email (onboarding
        links, notices, inspection reminders), provide support, and meet legal obligations. We do not
        sell your personal information.
      </p>

      <H>3. Disclosure and service providers</H>
      <p>
        We share personal information only as needed to run the Service — for example with our hosting
        and infrastructure providers (Vercel, Supabase), our email provider (Resend), and payment
        providers (Stripe) where you use paid features. These providers process data on our behalf
        under their own terms. Some may store data outside Australia; we take reasonable steps to
        ensure appropriate protections.
      </p>

      <H>4. Tenant information</H>
      <p>
        Where a property manager invites a tenant, the manager is responsible for the tenancy data
        they enter. Tenant accounts can access only their own tenancy. We act as processor of that
        data on the manager&apos;s behalf.
      </p>

      <H>5. Security</H>
      <p>
        Data is stored with per-organisation access controls (row-level security) and private file
        storage. No system is perfectly secure, but we take reasonable steps to protect personal
        information from misuse, loss and unauthorised access.
      </p>

      <H>6. Access and correction</H>
      <p>
        You can access and correct most of your information directly in the app. To request access to
        or correction of other personal information, contact us at the address below.
      </p>

      <H>7. Retention</H>
      <p>
        We keep personal information for as long as your account is active and as needed for legal and
        operational purposes, after which it is deleted or de-identified.
      </p>

      <H>8. Complaints and contact</H>
      <p>
        For privacy questions or complaints, contact{" "}
        <a href={`mailto:admin@${brand.domain}`} className="text-accent hover:underline">admin@{brand.domain}</a>.
        If you are not satisfied with our response you may contact the Office of the Australian
        Information Commissioner (OAIC).
      </p>

      <H>9. Changes</H>
      <p>We may update this policy; material changes will be notified in the app or by email.</p>

      <p>
        See also our{" "}
        <Link href="/legal/terms" className="text-accent hover:underline">Terms of Service</Link>.
      </p>
    </Legal>
  );
}

function Legal({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" className="text-sm text-accent hover:underline">← {brand.name}</Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted">Last updated: {updated}</p>
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-muted [&_p]:text-muted [&_strong]:text-foreground">
        {children}
      </div>
      <p className="mt-10 rounded-xl border border-border bg-surface p-4 text-xs text-muted">
        This is a draft template with placeholders in [brackets]. Complete the placeholders and have
        it reviewed by an Australian lawyer before relying on it publicly.
      </p>
    </div>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="pt-2 text-base font-semibold text-foreground">{children}</h2>;
}
