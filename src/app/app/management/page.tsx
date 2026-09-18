import ComingSoon from "@/components/app/ComingSoon";

export default function ManagementPage() {
  return (
    <ComingSoon
      title="Management"
      intro="Everything needed to self-manage properly — inspections, compliance and tenant communication, on a schedule so nothing slips and everything's on file."
      planned={[
        {
          name: "Inspection scheduling",
          body: "Quarterly routine inspections with the correct SA notice rules built in: 7–28 days' written notice, up to 4 per year, 8am–8pm except Sundays and public holidays, max 2 hours.",
        },
        {
          name: "Compliance tracking",
          body: "Smoke-alarm checks, bond lodgement status and condition reports tracked per property, with reminders before anything lapses.",
        },
        {
          name: "Tenant communication",
          body: "Onboarding, notices and the tenant handbook kept per tenancy, with a record of what was sent and when.",
        },
        {
          name: "Real authentication",
          body: "Supabase Auth and locked-down row-level security replace the current passcode gate before real tenant data is trusted to the platform.",
        },
      ]}
    />
  );
}
