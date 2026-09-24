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
  LeaseTenant,
  MaintenanceRequest,
  MaintenanceStatus,
  MaintenanceUrgency,
  Notice,
  OnboardingItem,
  Organization,
  OrgMember,
  OrgRole,
  Payment,
  PortalResource,
  Property,
  PropertyCost,
  PropertyInput,
  PropertyPhoto,
  Tenancy,
  TenantApplication,
} from "./types";
import { daysUntil, portfolioStats } from "./format";

export type TenancyInput = Omit<Tenancy, "id" | "created_at">;
// A person on a lease as edited in the tenancy form. `id` present = existing
// row to update (documents left untouched); absent = a new person to insert.
export type LeaseTenantDraft = {
  id?: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
  emergency_name: string | null;
  emergency_phone: string | null;
  emergency_relationship: string | null;
};
export type InspectionInput = Omit<Inspection, "id" | "created_at">;
export type NoticeInput = Omit<Notice, "id" | "created_at">;
export type ResourceInput = Omit<PortalResource, "id" | "created_at">;
export type PropertyCostInput = Omit<PropertyCost, "id" | "org_id" | "created_at">;
export type PropertyPhotoInput = Omit<PropertyPhoto, "id" | "org_id" | "created_at">;

interface PortfolioContextValue {
  properties: Property[];
  paymentsByProperty: Record<string, Payment[]>;
  tenancies: Tenancy[];
  leaseTenants: LeaseTenant[];
  inspections: Inspection[];
  applications: TenantApplication[];
  notices: Notice[];
  resources: PortalResource[];
  maintenance: MaintenanceRequest[];
  propertyCosts: PropertyCost[];
  propertyPhotos: PropertyPhoto[];
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
  setRentOnlineEnabled: (enabled: boolean) => Promise<{ error?: string }>;
  setDefaultState: (state: string) => Promise<{ error?: string }>;
  createInvite: (role: OrgRole) => Promise<{ token?: string; error?: string }>;
  removeMember: (userId: string) => Promise<{ error?: string }>;
  updateRequestStatus: (id: string, status: MaintenanceStatus) => Promise<{ error?: string }>;
  addMatterMessage: (requestId: string, body: string) => Promise<{ error?: string }>;
  addTask: (input: {
    property_id: string;
    tenancy_id?: string | null;
    kind: string;
    category: string;
    title: string;
    description?: string | null;
    urgency: MaintenanceUrgency;
    due_date?: string | null;
  }) => Promise<{ error?: string }>;
  markNotificationsRead: () => Promise<void>;
  saveProperty: (data: PropertyInput, id?: string) => Promise<{ error?: string }>;
  addPayment: (
    propertyId: string,
    input: { due_date: string; amount: number; received_date: string | null }
  ) => Promise<{ error?: string }>;
  markPaymentReceived: (paymentId: string, receivedDate: string) => Promise<{ error?: string }>;
  saveTenancy: (
    data: TenancyInput,
    id?: string,
    people?: LeaseTenantDraft[]
  ) => Promise<{ error?: string }>;
  setOnboarding: (tenancyId: string, items: OnboardingItem[]) => Promise<{ error?: string }>;
  saveInspection: (data: InspectionInput, id?: string) => Promise<{ error?: string }>;
  createApplication: (tenancyId: string) => Promise<{ token?: string; error?: string }>;
  enablePortal: (tenancyId: string) => Promise<{ token?: string; error?: string }>;
  addNotice: (data: NoticeInput) => Promise<{ error?: string }>;
  deleteNotice: (id: string) => Promise<{ error?: string }>;
  addResource: (data: ResourceInput) => Promise<{ error?: string }>;
  deleteResource: (id: string) => Promise<{ error?: string }>;
  addPropertyCost: (data: PropertyCostInput) => Promise<{ error?: string }>;
  deletePropertyCost: (id: string) => Promise<{ error?: string }>;
  addPropertyPhoto: (data: PropertyPhotoInput) => Promise<{ error?: string }>;
  deletePropertyPhoto: (id: string, path: string) => Promise<{ error?: string }>;
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [paymentsByProperty, setPaymentsByProperty] = useState<Record<string, Payment[]>>({});
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [leaseTenants, setLeaseTenants] = useState<LeaseTenant[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [applications, setApplications] = useState<TenantApplication[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [resources, setResources] = useState<PortalResource[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRequest[]>([]);
  const [propertyCosts, setPropertyCosts] = useState<PropertyCost[]>([]);
  const [propertyPhotos, setPropertyPhotos] = useState<PropertyPhoto[]>([]);
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

    const { data: lt } = await supabase
      .from("lease_tenants")
      .select("*")
      .order("created_at");
    setLeaseTenants((lt as LeaseTenant[]) || []);

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

    const { data: costs } = await supabase
      .from("property_costs")
      .select("*")
      .order("spent_on", { ascending: false });
    setPropertyCosts((costs as PropertyCost[]) || []);

    const { data: photos } = await supabase
      .from("property_photos")
      .select("*")
      .order("created_at", { ascending: false });
    setPropertyPhotos((photos as PropertyPhoto[]) || []);

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

  // Confirm a due/late payment as received (manual reconciliation). Status is
  // derived from the received date vs. the due date.
  const markPaymentReceived = useCallback(
    async (paymentId: string, receivedDate: string) => {
      let dueDate: string | null = null;
      for (const list of Object.values(paymentsByProperty)) {
        const p = list.find((x) => x.id === paymentId);
        if (p) {
          dueDate = p.due_date;
          break;
        }
      }
      const status: Payment["status"] = dueDate && receivedDate > dueDate ? "late" : "paid";
      const res = await supabase
        .from("payments")
        .update({ received_date: receivedDate, status })
        .eq("id", paymentId);
      if (res.error) return { error: res.error.message };
      await reload();
      return {};
    },
    [reload, paymentsByProperty]
  );

  const saveTenancy = useCallback(
    async (data: TenancyInput, id?: string, people?: LeaseTenantDraft[]) => {
      // If people are supplied, the primary person is the source of truth for
      // the tenancy's tenant_name/email/phone (portal + email fan-out read
      // these) and a summary of their emergency contact keeps the portal's
      // emergency line populated.
      let row: TenancyInput = data;
      if (people && people.length > 0) {
        const primary = people.find((p) => p.is_primary) ?? people[0];
        const emergency = [
          primary.emergency_name,
          primary.emergency_relationship ? `(${primary.emergency_relationship})` : "",
          primary.emergency_phone,
        ]
          .filter(Boolean)
          .join(" ")
          .trim();
        row = {
          ...data,
          tenant_name: primary.name,
          tenant_email: primary.email,
          tenant_phone: primary.phone,
          emergency_contact: emergency || null,
        };
      }

      const res = id
        ? await supabase.from("tenancies").update(row).eq("id", id)
        : await supabase.from("tenancies").insert(row).select("id").single();
      if (res.error) return { error: res.error.message };
      const tenancyId = id ?? (res.data as { id: string } | null)?.id;

      // Reconcile the people on this lease. Rows carrying an id are updated
      // (documents left untouched — those are edited in the lease detail view);
      // rows without an id are inserted; existing rows dropped from the list
      // are deleted.
      if (people && tenancyId) {
        const fields = (p: LeaseTenantDraft) => ({
          tenancy_id: tenancyId,
          name: p.name,
          email: p.email,
          phone: p.phone,
          is_primary: p.is_primary,
          emergency_name: p.emergency_name,
          emergency_phone: p.emergency_phone,
          emergency_relationship: p.emergency_relationship,
        });
        const keptIds = people.filter((p) => p.id).map((p) => p.id as string);
        const existing = leaseTenants.filter((lt) => lt.tenancy_id === tenancyId);
        const toDelete = existing.filter((lt) => !keptIds.includes(lt.id)).map((lt) => lt.id);
        if (toDelete.length > 0) {
          const del = await supabase.from("lease_tenants").delete().in("id", toDelete);
          if (del.error) return { error: del.error.message };
        }
        for (const p of people) {
          const r = p.id
            ? await supabase.from("lease_tenants").update(fields(p)).eq("id", p.id)
            : await supabase.from("lease_tenants").insert(fields(p));
          if (r.error) return { error: r.error.message };
        }
      }

      // Populate the expected rent schedule for this org right away.
      if (org?.id) await supabase.rpc("generate_rent_schedule", { p_org: org.id });
      await reload();
      return {};
    },
    [reload, org, leaseTenants]
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

  const setRentOnlineEnabled = useCallback(
    async (enabled: boolean) => {
      if (!org) return { error: "No organization." };
      const res = await supabase
        .from("organizations")
        .update({ rent_online_enabled: enabled })
        .eq("id", org.id);
      if (res.error) return { error: res.error.message };
      await reload();
      return {};
    },
    [org, reload]
  );

  const setDefaultState = useCallback(
    async (state: string) => {
      if (!org) return { error: "No organization." };
      const res = await supabase.from("organizations").update({ default_state: state }).eq("id", org.id);
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

  // Best-effort email to the tenant on a matter update (never blocks the update).
  const emailTenantForRequest = useCallback(
    (requestId: string, subject: string, body: string) => {
      const req = maintenance.find((m) => m.id === requestId);
      const ten = tenancies.find((t) => t.id === req?.tenancy_id);
      if (!ten) return;
      // Fan out to everyone on the lease: the primary (tenant_email) plus every
      // co-tenant's email, deduped. One person raising a matter keeps the whole
      // household in the loop.
      const emails = Array.from(
        new Set(
          [
            ten.tenant_email,
            ...leaseTenants.filter((lt) => lt.tenancy_id === ten.id).map((lt) => lt.email),
          ]
            .map((e) => e?.trim())
            .filter((e): e is string => !!e)
        )
      );
      for (const to of emails) {
        fetch("/api/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to, subject, body, tenancyId: ten.id }),
        }).catch(() => {});
      }
    },
    [maintenance, tenancies, leaseTenants]
  );

  const updateRequestStatus = useCallback(
    async (id: string, status: MaintenanceStatus) => {
      const res = await supabase
        .from("maintenance_requests")
        .update({ status, resolved_at: status === "resolved" ? new Date().toISOString() : null })
        .eq("id", id);
      if (res.error) return { error: res.error.message };
      // Log the phase change to the shared thread and let the tenant know.
      await supabase.from("matter_messages").insert({ request_id: id, author: "manager", status_change: status });
      const req = maintenance.find((m) => m.id === id);
      emailTenantForRequest(
        id,
        `Update on your request: ${req?.title ?? ""}`,
        `The status of your request "${req?.title ?? ""}" is now: ${status.replace("_", " ")}. Log in to your tenant portal to see details.`
      );
      await reload();
      return {};
    },
    [reload, maintenance, emailTenantForRequest]
  );

  const addTask = useCallback(
    async (input: {
      property_id: string;
      tenancy_id?: string | null;
      kind: string;
      category: string;
      title: string;
      description?: string | null;
      urgency: MaintenanceUrgency;
      due_date?: string | null;
    }) => {
      const res = await supabase.from("maintenance_requests").insert({
        property_id: input.property_id,
        tenancy_id: input.tenancy_id ?? null,
        kind: input.kind,
        category: input.category,
        title: input.title,
        description: input.description ?? null,
        urgency: input.urgency,
        due_date: input.due_date ?? null,
        source: "manager",
        status: "open",
      });
      if (res.error) return { error: res.error.message };
      await reload();
      return {};
    },
    [reload]
  );

  const addMatterMessage = useCallback(
    async (requestId: string, body: string) => {
      if (!body.trim()) return { error: "Message is empty." };
      const res = await supabase
        .from("matter_messages")
        .insert({ request_id: requestId, author: "manager", body: body.trim() });
      if (res.error) return { error: res.error.message };
      const req = maintenance.find((m) => m.id === requestId);
      emailTenantForRequest(
        requestId,
        `Message about your request: ${req?.title ?? ""}`,
        `${body.trim()}\n\nLog in to your tenant portal to reply.`
      );
      await reload();
      return {};
    },
    [reload, maintenance, emailTenantForRequest]
  );

  const markNotificationsRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    // Optimistic.
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
  }, [notifications]);

  const addPropertyCost = useCallback(
    async (data: PropertyCostInput) => {
      const res = await supabase.from("property_costs").insert(data);
      if (res.error) return { error: res.error.message };
      await reload();
      return {};
    },
    [reload]
  );

  const deletePropertyCost = useCallback(
    async (id: string) => {
      const res = await supabase.from("property_costs").delete().eq("id", id);
      if (res.error) return { error: res.error.message };
      await reload();
      return {};
    },
    [reload]
  );

  const addPropertyPhoto = useCallback(
    async (data: PropertyPhotoInput) => {
      const res = await supabase.from("property_photos").insert(data);
      if (res.error) return { error: res.error.message };
      await reload();
      return {};
    },
    [reload]
  );

  const deletePropertyPhoto = useCallback(
    async (id: string, path: string) => {
      const res = await supabase.from("property_photos").delete().eq("id", id);
      if (res.error) return { error: res.error.message };
      // Best-effort remove the stored file too (row is the source of truth).
      await supabase.storage.from("property-photos").remove([path]);
      await reload();
      return {};
    },
    [reload]
  );

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
    leaseTenants,
    inspections,
    applications,
    notices,
    resources,
    maintenance,
    propertyCosts,
    propertyPhotos,
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
    setRentOnlineEnabled,
    setDefaultState,
    createInvite,
    removeMember,
    updateRequestStatus,
    addMatterMessage,
    addTask,
    markNotificationsRead,
    saveProperty,
    addPayment,
    markPaymentReceived,
    saveTenancy,
    setOnboarding,
    saveInspection,
    createApplication,
    enablePortal,
    addNotice,
    deleteNotice,
    addResource,
    deleteResource,
    addPropertyCost,
    deletePropertyCost,
    addPropertyPhoto,
    deletePropertyPhoto,
  };

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
}

export function usePortfolio(): PortfolioContextValue {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error("usePortfolio must be used within a PortfolioProvider");
  return ctx;
}
