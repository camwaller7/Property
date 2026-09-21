// Mirrors the Supabase schema from the handoff (properties + payments).
// Kept deliberately close to the DB columns so reads/writes are 1:1.

export type PaymentStatus = "due" | "paid" | "late";

export interface Property {
  id: string;
  address: string | null;
  weekly_rent: number | null;
  rent_due_day: string | null;
  lease_start: string | null;
  lease_end: string | null;
  bond: number | null;
  purchase_price: number | null;
  current_value: number | null;
  loan_balance: number | null;
  lender: string | null;
  created_at?: string;
}

export interface Payment {
  id: string;
  property_id: string;
  due_date: string | null;
  amount: number | null;
  received_date: string | null;
  status: PaymentStatus;
  created_at?: string;
}

export type TenancyStatus = "upcoming" | "active" | "ended";

export interface OnboardingItem {
  key: string;
  label: string;
  done: boolean;
  done_date?: string | null;
}

export interface Tenancy {
  id: string;
  property_id: string | null;
  tenant_name: string | null;
  tenant_email: string | null;
  tenant_phone: string | null;
  emergency_contact: string | null;
  move_in_date: string | null;
  lease_start: string | null;
  lease_end: string | null;
  weekly_rent: number | null;
  bond_amount: number | null;
  bond_lodged: boolean;
  bond_reference: string | null;
  status: TenancyStatus;
  onboarding: OnboardingItem[];
  notes: string | null;
  portal_token: string | null;
  created_at?: string;
}

export type OrgRole = "owner" | "admin" | "member";

export interface Organization {
  id: string;
  name: string;
  plan: string;
  subscription_status: string | null;
  current_period_end: string | null;
  created_at?: string;
}

export interface OrgMember {
  org_id: string;
  user_id: string;
  email: string | null;
  role: OrgRole;
  created_at?: string;
}

export interface OrgInvite {
  id: string;
  org_id: string;
  token: string;
  email: string | null;
  role: OrgRole;
  created_at?: string;
  accepted_at: string | null;
}

export type MaintenanceStatus = "open" | "in_progress" | "resolved" | "cancelled";
export type MaintenanceUrgency = "low" | "normal" | "urgent";

export interface MaintenanceRequest {
  id: string;
  org_id: string | null;
  tenancy_id: string | null;
  property_id: string | null;
  category: string;
  title: string;
  description: string | null;
  urgency: MaintenanceUrgency;
  status: MaintenanceStatus;
  photo_path: string | null;
  created_at?: string;
  resolved_at: string | null;
}

export type NoticeCategory = "rent" | "bill" | "maintenance" | "info";

export interface Notice {
  id: string;
  property_id: string | null;
  tenancy_id: string | null;
  category: NoticeCategory;
  title: string;
  body: string | null;
  due_date: string | null;
  created_at?: string;
}

export interface PortalResource {
  id: string;
  property_id: string | null;
  title: string;
  description: string | null;
  path: string | null;
  url: string | null;
  created_at?: string;
}

export interface EmailLogEntry {
  id: string;
  tenancy_id: string | null;
  to_email: string;
  subject: string | null;
  body: string | null;
  status: "sent" | "failed";
  error: string | null;
  created_at?: string;
}

export interface ApplicationDocument {
  kind: string;
  name: string;
  path: string;
  size?: number;
  uploaded_at?: string;
}

export type ApplicationStatus = "invited" | "submitted";

export interface TenantApplication {
  id: string;
  tenancy_id: string | null;
  token: string;
  status: ApplicationStatus;
  data: Record<string, unknown>;
  documents: ApplicationDocument[];
  submitted_at: string | null;
  created_at?: string;
}

export type InspectionKind = "entry" | "routine" | "exit";
export type InspectionStatus = "scheduled" | "completed" | "cancelled";

export interface Inspection {
  id: string;
  property_id: string | null;
  tenancy_id: string | null;
  kind: InspectionKind;
  scheduled_date: string | null;
  scheduled_time: string | null;
  notice_sent_date: string | null;
  status: InspectionStatus;
  notes: string | null;
  created_at?: string;
}

// Editable subset used by the add/edit property form.
export type PropertyInput = Omit<Property, "id" | "created_at">;

export const emptyProperty: PropertyInput = {
  address: "",
  weekly_rent: null,
  rent_due_day: "",
  lease_start: null,
  lease_end: null,
  bond: null,
  purchase_price: null,
  current_value: null,
  loan_balance: null,
  lender: "",
};
