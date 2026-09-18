import ComingSoon from "@/components/app/ComingSoon";

export default function RenovationsPage() {
  return (
    <ComingSoon
      title="Renovations"
      intro="Track renovation projects and every dollar spent against the value they add — filed so handing everything to your accountant at tax time is painless."
      planned={[
        {
          name: "Receipt capture",
          body: "Photograph receipts from your phone and attach them to a property and project. Stored in Supabase storage, never lost.",
        },
        {
          name: "Tax categorisation",
          body: "Auto-categorise spend (capital works, repairs, depreciable assets) so the deductible vs. capital split is clear.",
        },
        {
          name: "Cost vs. value added",
          body: "Running renovation cost per property, tracked against the change in current value to show real return.",
        },
        {
          name: "Accountant export",
          body: "One-click, itemised export of receipts and totals per financial year, per property.",
        },
      ]}
    />
  );
}
