import type { Metadata } from "next";
import AppShell from "@/components/app/AppShell";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: `${brand.name} — Workspace`,
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
