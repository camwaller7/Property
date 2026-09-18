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
import type { Payment, Property, PropertyInput } from "./types";
import { daysUntil, portfolioStats } from "./format";

interface PortfolioContextValue {
  properties: Property[];
  paymentsByProperty: Record<string, Payment[]>;
  loading: boolean;
  error: string | null;
  stats: ReturnType<typeof portfolioStats>;
  reload: () => Promise<void>;
  saveProperty: (data: PropertyInput, id?: string) => Promise<{ error?: string }>;
  addPayment: (
    propertyId: string,
    input: { due_date: string; amount: number; received_date: string | null }
  ) => Promise<{ error?: string }>;
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [paymentsByProperty, setPaymentsByProperty] = useState<Record<string, Payment[]>>({});
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

  const stats = useMemo(
    () => portfolioStats(properties, paymentsByProperty),
    [properties, paymentsByProperty]
  );

  const value: PortfolioContextValue = {
    properties,
    paymentsByProperty,
    loading,
    error,
    stats,
    reload,
    saveProperty,
    addPayment,
  };

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
}

export function usePortfolio(): PortfolioContextValue {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error("usePortfolio must be used within a PortfolioProvider");
  return ctx;
}
