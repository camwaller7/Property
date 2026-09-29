"use client";

import ComplianceRegister from "@/components/app/ComplianceRegister";
import { usePortfolio } from "@/lib/portfolio";

export default function CompliancePage() {
  const { loading } = usePortfolio();
  if (loading) return <p className="text-muted">Loading…</p>;
  return <ComplianceRegister />;
}
