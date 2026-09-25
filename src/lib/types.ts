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
  state: string | null; // NSW VIC QLD SA WA TAS ACT NT
  created_at?: string;
}

export interface Payment {
  id: string;
  property_id: string;
  due_date: string | null;
  amount: number | null;
  received_date: string | null;
  status: PaymentStatus;
  paid_online?: boolean;
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
  rent_frequency: "weekly" | "fortnightly" | "monthly";
  onboarding: OnboardingItem[];
  notes: string | null;
  portal_token: string | null;
  ended_at?: string | null;
  created_at?: string;
}

// Snapshot written when a tenancy ends — a tenant-owned rental record that
// survives past the live tenancy and is the basis for portable history.
export interface RentalHistory {
  id: string;
  org_id?: string | null;
  tenancy_id: string | null;
  property_id: string | null;
  tenant_user_id: string | null;
  property_address: string | null;
  tenant_name: string | null;
  lease_start: string | null;
  lease_end: string | null;
  ended_on: string | null;
  weekly_rent: number | null;
  rent_frequency: string | null;
  bond_amount: number | null;
  conduct_note: string | null;
  created_at?: string;
}

// A per-person document/ID stored against a lease tenant (private bucket).
export interface TenantDocument {
  kind: string; // e.g. "id", "payslip", "reference", "other"
  name: string;
  path: string;
  size?: number;
  uploaded_at?: string;
}

// One person on a lease. A tenancy (the lease) has one or more of these; the
// person flagged is_primary has their contact mirrored onto the tenancy row so
// the portal/applications/email keep working. Emergency contact is per person.
export interface LeaseTenant {
  id: string;
  org_id?: string | null;
  tenancy_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
  emergency_name: string | null;
  emergency_phone: string | null;
  emergency_relationship: string | null;
  documents: TenantDocument[];
  created_at?: string;
}

export type OrgRole = "owner" | "admin" | "member";

export interface Organization {
  id: string;
  name: string;
  plan: string;
  subscription_status: string | null;
  current_period_end: string | null;
  rent_online_enabled?: boolean;
  default_state?: string | null;
  stripe_account_id?: string | null;
  stripe_charges_enabled?: boolean;
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

export interface AppNotification {
  id: string;
  org_id: string | null;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  entity_id: string | null;
  read: boolean;
  created_at?: string;
}

export type MaintenanceStatus = "open" | "in_progress" | "scheduled" | "resolved" | "cancelled";
export type MaintenanceUrgency = "low" | "normal" | "urgent";
export type MatterKind = "maintenance" | "enquiry" | "complaint" | "communication";

export interface MatterMessage {
  author: "tenant" | "manager";
  body: string | null;
  status_change: string | null;
  created_at?: string;
}

export interface MaintenanceRequest {
  id: string;
  org_id: string | null;
  tenancy_id: string | null;
  property_id: string | null;
  kind: MatterKind | string;
  category: string;
  title: string;
  description: string | null;
  urgency: MaintenanceUrgency;
  status: MaintenanceStatus;
  photo_path: string | null;
  due_date?: string | null;
  source?: "tenant" | "manager";
  messages?: MatterMessage[];
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
  org_id?: string | null;
  token: string;
  status: ApplicationStatus;
  data: Record<string, unknown>;
  documents: ApplicationDocument[];
  submitted_at: string | null;
  created_at?: string;
}

// Property cost tracking. Every investor has costs (rates, insurance, loan
// interest = holding; repairs = maintenance; capital works = improvement),
// so this is generic rather than renovation-specific.
export type CostCategory = "holding" | "maintenance" | "improvement";

export interface PropertyCost {
  id: string;
  org_id?: string | null;
  property_id: string | null;
  description: string;
  category: CostCategory;
  amount: number | null;
  spent_on: string | null;
  receipt_path: string | null;
  created_at?: string;
}

export interface PropertyPhoto {
  id: string;
  org_id?: string | null;
  property_id: string | null;
  path: string;
  caption: string | null;
  taken_on: string | null;
  created_at?: string;
}

// Recurring property outgoings (council rates, water, insurance…). Landlord
// data; `payer` marks whether it's landlord-paid or recoverable from the tenant.
export type BillKind = "council_rates" | "water" | "insurance" | "strata" | "land_tax" | "other";
export type BillFrequency = "quarterly" | "annual" | "monthly";

export interface PropertyBill {
  id: string;
  org_id?: string | null;
  property_id: string | null;
  kind: BillKind | string;
  label: string | null;
  amount: number | null;
  frequency: BillFrequency | string;
  next_due: string | null;
  payer: "landlord" | "tenant" | string;
  notes: string | null;
  active: boolean;
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
  state: null,
};
