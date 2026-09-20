"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "./supabase";
import type {
  Inspection,
  OnboardingItem,
  Payment,
  Property,
  PropertyInput,
  Tenancy,
  TenantApplication,
} from "./types";
import { daysUntil, portfolioStats } from "./format";

export type TenancyInput = Omit<Tenancy, "id" | "created_at">;
export type InspectionInput = Omit<Inspection, "id" | "created_at">;

interface PortfolioContextValue {
  properties: Property[];
  paymentsByProperty: Record<string, Payment[]>;
  tenancies: Tenancy[];
  inspections: Inspection[];
  applications: TenantApplication[];
  loading: boolean;
  error: string | null;
  stats: ReturnType<typeof portfolioStats>;
  reload: () => Promise<void>;
  saveProperty: (data: PropertyInput, id?: string) => Promise<{ error?: string }>;
  addPayment: (
    propertyId: string,
    input: { due_date: string; amount: number; received_date: string | null }
  ) => Promise<{ error?: string }>;
  saveTenancy: (data: TenancyInput, id?: string) => Promise<{ error?: string }>;
  setOnboarding: (tenancyId: string, items: OnboardingItem[]) => Promise<{ error?: string }>;
  saveInspection: (data: InspectionInput, id?: string) => Promise<{ error?: string }>;
  createApplication: (tenancyId: string) => Promise<{ token?: string; error?: string }>;
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [paymentsByProperty, setPaymentsByProperty] = useState<Record<string, Payment[]>>({});
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [applications, setApplications] = useState<TenantApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: props, error: propErr } = await supabase
      .from("properties")
      .select("*")
      .order("created_at");
    if (propErr) {
      setError(propErr.message);
      setLoading(false);
      return;
    }
    setProperties((props as Property[]) || []);

    const { data: pays } = await supabase.from("payments").select("*");
    const grouped: Record<string, Payment[]> = {};
    for (const pay of (pays as Payment[]) || []) {
      (grouped[pay.property_id] ||= []).push(pay);
    }
    setPaymentsByProperty(grouped);

    const { data: tens } = await supabase.from("tenancies").select("*").order("created_at");
    setTenancies((tens as Tenancy[]) || []);

    const { data: insp } = await supabase
      .from("inspections")
      .select("*")
      .order("scheduled_date");
    setInspections((insp as Inspection[]) || []);

    const { data: apps } = await supabase
      .from("tenant_applications")
      .select("*")
      .order("created_at");
    setApplications((apps as TenantApplication[]) || []);

    setLoading(false);
  }, []);

  useEffect(() => {
    // Initial fetch on mount. `reload` flips `loading`/`error` synchronously,
    // so defer it a microtask to keep the effect body free of synchronous
    // setState (external-data sync, not derived state).
    let active = true;
    Promise.resolve().then(() => {
      if (active) reload();
    });
    return () => {
      active = false;
    };
  }, [reload]);

  const saveProperty = useCallback(
    async (data: PropertyInput, id?: string) => {
      const res = id
        ? await supabase.from("properties").update(data).eq("id", id)
        : await supabase.from("properties").insert(data);
      if (res.error) return { error: res.error.message };
      await reload();
      return {};
    },
    [reload]
  );

  const addPayment = useCallback(
    async (
      propertyId: string,
      input: { due_date: string; amount: number; received_date: string | null }
    ) => {
      // Derive status the same way the original app did: received after due =
      // late, received on/before due = paid, otherwise due (late if overdue).
      let status: Payment["status"] = "due";
      if (input.received_date) {
        status = input.received_date > input.due_date ? "late" : "paid";
      } else if ((daysUntil(input.due_date) ?? 0) < 0) {
        status = "late";
      }
      const res = await supabase.from("payments").insert({
        property_id: propertyId,
        due_date: input.due_date,
        amount: input.amount,
        received_date: input.received_date,
        status,
      });
      if (res.error) return { error: res.error.message };
      await reload();
      return {};
    },
    [reload]
  );

  const saveTenancy = useCallback(
    async (data: TenancyInput, id?: string) => {
      const res = id
        ? await supabase.from("tenancies").update(data).eq("id", id)
        : await supabase.from("tenancies").insert(data);
      if (res.error) return { error: res.error.message };
      await reload();
      return {};
    },
    [reload]
  );

  const setOnboarding = useCallback(
    async (tenancyId: string, items: OnboardingItem[]) => {
      // Optimistic update so ticking a checklist item feels instant.
      setTenancies((prev) =>
        prev.map((t) => (t.id === tenancyId ? { ...t, onboarding: items } : t))
      );
      const res = await supabase
        .from("tenancies")
        .update({ onboarding: items })
        .eq("id", tenancyId);
      if (res.error) {
        await reload();
        return { error: res.error.message };
      }
      return {};
    },
    [reload]
  );

  const saveInspection = useCallback(
    async (data: InspectionInput, id?: string) => {
      const res = id
        ? await supabase.from("inspections").update(data).eq("id", id)
        : await supabase.from("inspections").insert(data);
      if (res.error) return { error: res.error.message };
      await reload();
      return {};
    },
    [reload]
  );

  const createApplication = useCallback(
    async (tenancyId: string) => {
      // Reuse an existing application for this tenancy if one was already made.
      const existing = applications.find((a) => a.tenancy_id === tenancyId);
      if (existing) return { token: existing.token };

      const token =
        (globalThis.crypto?.randomUUID?.() ?? String(Math.random())).replace(/-/g, "") +
        Math.random().toString(36).slice(2, 8);
      const res = await supabase
        .from("tenant_applications")
        .insert({ tenancy_id: tenancyId, token, status: "invited" });
      if (res.error) return { error: res.error.message };
      await reload();
      return { token };
    },
    [applications, reload]
  );

  const stats = useMemo(
    () => portfolioStats(properties, paymentsByProperty),
    [properties, paymentsByProperty]
  );

  const value: PortfolioContextValue = {
    properties,
    paymentsByProperty,
    tenancies,
    inspections,
    applications,
    loading,
    error,
    stats,
    reload,
    saveProperty,
    addPayment,
    saveTenancy,
    setOnboarding,
    saveInspection,
    createApplication,
  };

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
}

export function usePortfolio(): PortfolioContextValue {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error("usePortfolio must be used within a PortfolioProvider");
  return ctx;
}
