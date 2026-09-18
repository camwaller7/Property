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
