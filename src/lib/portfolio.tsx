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
  AppNotification,
  Inspection,
  MaintenanceRequest,
  MaintenanceStatus,
  Notice,
  OnboardingItem,
  Organization,
  OrgMember,
  OrgRole,
  Payment,
  PortalResource,
  Property,
  PropertyInput,
  Tenancy,
  TenantApplication,
} from "./types";
import { daysUntil, portfolioStats } from "./format";

export type TenancyInput = Omit<Tenancy, "id" | "created_at">;
export type InspectionInput = Omit<Inspection, "id" | "created_at">;
export type NoticeInput = Omit<Notice, "id" | "created_at">;
export type ResourceInput = Omit<PortalResource, "id" | "created_at">;

interface PortfolioContextValue {
  properties: Property[];
  paymentsByProperty: Record<string, Payment[]>;
  tenancies: Tenancy[];
  inspections: Inspection[];
  applications: TenantApplication[];
  notices: Notice[];
  resources: PortalResource[];
  maintenance: MaintenanceRequest[];
  notifications: AppNotification[];
  unreadCount: number;
  org: Organization | null;
  members: OrgMember[];
  myRole: OrgRole | null;
  userId: string | null;
  loading: boolean;
  error: string | null;
  stats: ReturnType<typeof portfolioStats>;
  reload: () => Promise<void>;
  updateOrgName: (name: string) => Promise<{ error?: string }>;
  createInvite: (role: OrgRole) => Promise<{ token?: string; error?: string }>;
  removeMember: (userId: string) => Promise<{ error?: string }>;
  updateRequestStatus: (id: string, status: MaintenanceStatus) => Promise<{ error?: string }>;
  markNotificationsRead: () => Promise<void>;
  saveProperty: (data: PropertyInput, id?: string) => Promise<{ error?: string }>;
  addPayment: (
    propertyId: string,
    input: { due_date: string; amount: number; received_date: string | null }
  ) => Promise<{ error?: string }>;
  saveTenancy: (data: TenancyInput, id?: string) => Promise<{ error?: string }>;
  setOnboarding: (tenancyId: string, items: OnboardingItem[]) => Promise<{ error?: string }>;
  saveInspection: (data: InspectionInput, id?: string) => Promise<{ error?: string }>;
  createApplication: (tenancyId: string) => Promise<{ token?: string; error?: string }>;
  enablePortal: (tenancyId: string) => Promise<{ token?: string; error?: string }>;
  addNotice: (data: NoticeInput) => Promise<{ error?: string }>;
  deleteNotice: (id: string) => Promise<{ error?: string }>;
  addResource: (data: ResourceInput) => Promise<{ error?: string }>;
  deleteResource: (id: string) => Promise<{ error?: string }>;
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [paymentsByProperty, setPaymentsByProperty] = useState<Record<string, Payment[]>>({});
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [applications, setApplications] = useState<TenantApplication[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [resources, setResources] = useState<PortalResource[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRequest[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
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

    const { data: nots } = await supabase
      .from("notices")
      .select("*")
      .order("created_at", { ascending: false });
    setNotices((nots as Notice[]) || []);

    const { data: rsrc } = await supabase
      .from("portal_resources")
      .select("*")
      .order("created_at", { ascending: false });
    setResources((rsrc as PortalResource[]) || []);

    const { data: maint } = await supabase
      .from("maintenance_requests")
      .select("*")
      .order("created_at", { ascending: false });
    setMaintenance((maint as MaintenanceRequest[]) || []);

    const { data: notifs } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifications((notifs as AppNotification[]) || []);

    // Organization context (current user's org + team).
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id ?? null;
    setUserId(uid);
    const { data: orgs } = await supabase.from("organizations").select("*").order("created_at");
    const currentOrg = ((orgs as Organization[]) || [])[0] ?? null;
    setOrg(currentOrg);
    if (currentOrg) {
      const { data: mem } = await supabase
        .from("org_members")
        .select("*")
        .eq("org_id", currentOrg.id)
        .order("created_at");
      setMembers((mem as OrgMember[]) || []);
    } else {
      setMembers([]);
    }

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

  const enablePortal = useCallback(
    async (tenancyId: string) => {
      const existing = tenancies.find((t) => t.id === tenancyId);
      if (existing?.portal_token) return { token: existing.portal_token };
      const token =
        (globalThis.crypto?.randomUUID?.() ?? String(Math.random())).replace(/-/g, "") +
        Math.random().toString(36).slice(2, 8);
      const res = await supabase.from("tenancies").update({ portal_token: token }).eq("id", tenancyId);
      if (res.error) return { error: res.error.message };
      await reload();
      return { token };
    },
    [tenancies, reload]
  );

  const addNotice = useCallback(
    async (data: NoticeInput) => {
      const res = await supabase.from("notices").insert(data);
      if (res.error) return { error: res.error.message };
      await reload();
      return {};
    },
    [reload]
  );

  const deleteNotice = useCallback(
    async (id: string) => {
      const res = await supabase.from("notices").delete().eq("id", id);
      if (res.error) return { error: res.error.message };
      await reload();
      return {};
    },
    [reload]
  );

  const addResource = useCallback(
    async (data: ResourceInput) => {
      const res = await supabase.from("portal_resources").insert(data);
      if (res.error) return { error: res.error.message };
      await reload();
      return {};
    },
    [reload]
  );

  const deleteResource = useCallback(
    async (id: string) => {
      const res = await supabase.from("portal_resources").delete().eq("id", id);
      if (res.error) return { error: res.error.message };
      await reload();
      return {};
    },
    [reload]
  );

  const updateOrgName = useCallback(
    async (name: string) => {
      if (!org) return { error: "No organization." };
      const res = await supabase.from("organizations").update({ name }).eq("id", org.id);
      if (res.error) return { error: res.error.message };
      await reload();
      return {};
    },
    [org, reload]
  );

  const createInvite = useCallback(
    async (role: OrgRole) => {
      if (!org) return { error: "No organization." };
      const token =
        (globalThis.crypto?.randomUUID?.() ?? String(Math.random())).replace(/-/g, "") +
        Math.random().toString(36).slice(2, 8);
      const res = await supabase.from("org_invites").insert({ org_id: org.id, token, role });
      if (res.error) return { error: res.error.message };
      await reload();
      return { token };
    },
    [org, reload]
  );

  const removeMember = useCallback(
    async (memberUserId: string) => {
      if (!org) return { error: "No organization." };
      const res = await supabase
        .from("org_members")
        .delete()
        .eq("org_id", org.id)
        .eq("user_id", memberUserId);
      if (res.error) return { error: res.error.message };
      await reload();
      return {};
    },
    [org, reload]
  );

  const updateRequestStatus = useCallback(
    async (id: string, status: MaintenanceStatus) => {
      const res = await supabase
        .from("maintenance_requests")
        .update({ status, resolved_at: status === "resolved" ? new Date().toISOString() : null })
        .eq("id", id);
      if (res.error) return { error: res.error.message };
      await reload();
      return {};
    },
    [reload]
  );

  const markNotificationsRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    // Optimistic.
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const myRole: OrgRole | null =
    members.find((m) => m.user_id === userId)?.role ?? null;

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
    notices,
    resources,
    maintenance,
    notifications,
    unreadCount,
    org,
    members,
    myRole,
    userId,
    loading,
    error,
    stats,
    reload,
    updateOrgName,
    createInvite,
    removeMember,
    updateRequestStatus,
    markNotificationsRead,
    saveProperty,
    addPayment,
    saveTenancy,
    setOnboarding,
    saveInspection,
    createApplication,
    enablePortal,
    addNotice,
    deleteNotice,
    addResource,
    deleteResource,
  };

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
}

export function usePortfolio(): PortfolioContextValue {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error("usePortfolio must be used within a PortfolioProvider");
  return ctx;
}
