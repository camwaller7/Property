import Link from "next/link";
import { brand } from "@/lib/brand";

export const metadata = {
  title: `Terms of Service — ${brand.full}`,
};

// Draft Terms of Service. Placeholders in [brackets] must be completed and the
// whole document reviewed by an Australian lawyer before public launch.
export default function TermsPage() {
  return (
    <Legal title="Terms of Service" updated="24 September 2026">
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of {brand.full}
        (the &quot;Service&quot;), operated by [legal entity name] (ABN [ABN]) (&quot;we&quot;,
        &quot;us&quot;). By creating an account or using the Service you agree to these Terms.
      </p>

      <H>1. The Service</H>
      <p>
        {brand.full} is property-management software for landlords, property managers and their
        tenants. It helps you record tenancies, documents, maintenance, inspections and payments.
        The Service is provided on an &quot;as is&quot; basis and we may change or discontinue
        features from time to time.
      </p>

      <H>2. Not legal or financial advice</H>
      <p>
        Templates, generated documents, jurisdiction summaries and any AI-assisted output are
        general information only and are <strong>not legal, financial or tax advice</strong>. Tenancy
        law is state-based and changes; you must confirm requirements with the relevant authority and
        obtain professional advice before relying on anything produced by the Service.
      </p>

      <H>3. Accounts and eligibility</H>
      <p>
        You are responsible for the accuracy of the information you enter, for keeping your login
        credentials secure, and for all activity under your account. Tenant accounts may access only
        the tenancy they are linked to. You must not attempt to access data belonging to other
        organisations or tenants.
      </p>

      <H>4. Your data</H>
      <p>
        You retain ownership of the data you upload. You grant us the limited rights needed to host
        and operate the Service. Our handling of personal information is described in our{" "}
        <Link href="/legal/privacy" className="text-accent hover:underline">Privacy Policy</Link>.
      </p>

      <H>5. Acceptable use</H>
      <p>
        You must not use the Service unlawfully, upload malicious content, infringe others&apos;
        rights, or use it to send unsolicited messages. We may suspend accounts that breach these
        Terms or put the Service or others at risk.
      </p>

      <H>6. Fees</H>
      <p>
        Paid plans and their pricing are shown in the app. Fees are billed in advance and are
        non-refundable except where required by law, including the Australian Consumer Law.
      </p>

      <H>7. Liability</H>
      <p>
        Nothing in these Terms excludes rights you have under the Australian Consumer Law. To the
        extent permitted by law, our liability is limited to re-supplying the Service or the fees you
        paid in the previous 12 months, and we are not liable for indirect or consequential loss.
      </p>

      <H>8. Termination</H>
      <p>
        You may stop using the Service at any time. We may suspend or terminate access for breach of
        these Terms. On termination you may request an export of your data for a reasonable period.
      </p>

      <H>9. Changes</H>
      <p>
        We may update these Terms; material changes will be notified in the app or by email. Continued
        use after changes means you accept the updated Terms.
      </p>

      <H>10. Contact</H>
      <p>
        Questions about these Terms: <a href={`mailto:admin@${brand.domain}`} className="text-accent hover:underline">admin@{brand.domain}</a>.
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
