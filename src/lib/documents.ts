// Essential property-management document catalog. One source of truth that
// drives both the Documents library and the contextual prompts during tenant
// onboarding. Everything here is a Pro feature.
//
// Types:
//  - generate: we build a prefilled printable from the tenancy's data
//              (per-tenancy, via Management → Generate documents).
//  - template: a generic blank printable we render from `template` (any state).
//  - link:     an official external resource resolved from the property's
//              jurisdiction (authority / bonds / tribunal / tenant info).
//
// All templates are drafts to review, not legal advice.

import type { StateCode } from "./jurisdictions";

export type DocType = "generate" | "template" | "link";
export type DocCategory = "Starting a tenancy" | "During the tenancy" | "Ending the tenancy";

export interface TemplateSpec {
  intro?: string;
  fields?: string[];
  sections?: { title: string; lines?: number }[];
  body?: string;
}

export interface DocItem {
  key: string;
  title: string;
  category: DocCategory;
  type: DocType;
  description: string;
  onboardingKey?: string; // matches an onboarding checklist item key
  linkKey?: "authority" | "bonds" | "tribunal" | "tenantInfo";
  generateNote?: string;
  template?: TemplateSpec;
  states?: StateCode[]; // omitted = all states
}

export const DOCUMENTS: DocItem[] = [
  // ---- Starting a tenancy -------------------------------------------------
  {
    key: "tenancy_agreement",
    title: "Residential Tenancy Agreement",
    category: "Starting a tenancy",
    type: "generate",
    description: "The lease itself, prefilled from the tenancy. Generated per tenancy.",
    onboardingKey: "agreement",
    generateNote: "Open the tenancy in Management → Generate contract & handbook.",
  },
  {
    key: "tenant_info_statement",
    title: "Tenant information statement",
    category: "Starting a tenancy",
    type: "link",
    linkKey: "tenantInfo",
    description: "The information every new tenant must be given at the start of the tenancy.",
    onboardingKey: "info_statement",
  },
  {
    key: "ingoing_condition_report",
    title: "Ingoing condition report",
    category: "Starting a tenancy",
    type: "template",
    description: "Room-by-room record of the property's condition at move-in.",
    onboardingKey: "condition_report",
    template: {
      intro:
        "Complete with the tenant at move-in and give them a copy. Note condition (clean / working / damage) for each area.",
      fields: ["Property address", "Tenant name", "Date completed"],
      sections: [
        { title: "Entry / hallway", lines: 3 },
        { title: "Living areas", lines: 3 },
        { title: "Kitchen", lines: 3 },
        { title: "Bedrooms", lines: 4 },
        { title: "Bathroom / laundry", lines: 3 },
        { title: "Outdoor / garage", lines: 3 },
        { title: "Meter readings & keys issued", lines: 2 },
      ],
    },
  },
  {
    key: "bond_lodgement",
    title: "Lodge the bond",
    category: "Starting a tenancy",
    type: "link",
    linkKey: "bonds",
    description: "Where and how to lodge the tenant's bond with the state authority.",
    onboardingKey: "bond_lodged",
  },
  {
    key: "rent_authority",
    title: "Rent payment / direct debit authority",
    category: "Starting a tenancy",
    type: "template",
    description: "Record how, when and where rent will be paid.",
    onboardingKey: "first_rent",
    template: {
      intro: "Agree the rent amount, frequency, method and payment reference with the tenant.",
      fields: ["Tenant name", "Rent amount", "Frequency (weekly / fortnightly / monthly)", "First payment date", "Payment method", "Payment reference", "Account details / BPAY"],
    },
  },
  {
    key: "tenant_handbook",
    title: "Tenant handbook",
    category: "Starting a tenancy",
    type: "generate",
    description: "House rules, contacts and how the tenancy runs. Generated per tenancy.",
    onboardingKey: "handbook",
    generateNote: "Open the tenancy in Management → Generate contract & handbook.",
  },
  {
    key: "emergency_contacts",
    title: "Emergency & maintenance contacts",
    category: "Starting a tenancy",
    type: "template",
    description: "Who the tenant calls for urgent repairs and emergencies.",
    onboardingKey: "emergency_contacts",
    template: {
      intro: "Give the tenant a single sheet of key contacts.",
      fields: ["Property manager name & phone", "After-hours emergency phone", "Plumber", "Electrician", "Gas", "Other trades"],
    },
  },
  {
    key: "smoke_alarm_record",
    title: "Smoke alarm compliance record",
    category: "Starting a tenancy",
    type: "template",
    description: "Record smoke alarm testing and compliance.",
    onboardingKey: "smoke_alarms",
    template: {
      intro: "Log each smoke alarm check. Confirm your state's testing requirements with the authority.",
      fields: ["Property address", "Number of alarms", "Type (photoelectric / hardwired)", "Last tested date", "Next due date", "Checked by"],
    },
  },

  // ---- During the tenancy -------------------------------------------------
  {
    key: "entry_notice",
    title: "Notice of entry / inspection",
    category: "During the tenancy",
    type: "template",
    description: "Written notice to enter for a routine inspection or repairs.",
    template: {
      intro: "Serve within your state's notice window. Confirm the required notice period with the authority.",
      fields: ["Tenant name", "Property address", "Reason for entry", "Date of entry", "Time of entry", "Notice given on (date)"],
    },
  },
  {
    key: "rent_increase_notice",
    title: "Rent increase notice",
    category: "During the tenancy",
    type: "template",
    description: "Written notice of a rent increase.",
    template: {
      intro: "Check the minimum notice period and frequency limits for your state before serving.",
      fields: ["Tenant name", "Property address", "Current rent", "New rent", "Effective date", "Notice given on (date)"],
    },
  },
  {
    key: "breach_notice",
    title: "Breach / notice to remedy",
    category: "During the tenancy",
    type: "template",
    description: "Notify the tenant of a breach and the action required to remedy it.",
    template: {
      intro: "Describe the breach and the remedy period. Confirm the correct prescribed form/notice with the authority.",
      fields: ["Tenant name", "Property address", "Nature of breach", "Action required", "Remedy by (date)", "Notice given on (date)"],
    },
  },

  // ---- Ending the tenancy -------------------------------------------------
  {
    key: "notice_to_vacate",
    title: "Notice to vacate / termination",
    category: "Ending the tenancy",
    type: "template",
    description: "End the tenancy with the correct notice.",
    template: {
      intro: "Grounds and minimum notice periods vary by state — confirm with the authority before serving.",
      fields: ["Tenant name", "Property address", "Reason / grounds", "Vacate by (date)", "Notice given on (date)"],
    },
  },
  {
    key: "outgoing_condition_report",
    title: "Outgoing condition report",
    category: "Ending the tenancy",
    type: "template",
    description: "Compare the property's condition at exit against the ingoing report.",
    template: {
      intro: "Complete at the final inspection and compare against the ingoing report (fair wear and tear excepted).",
      fields: ["Property address", "Tenant name", "Date completed"],
      sections: [
        { title: "Entry / hallway", lines: 2 },
        { title: "Living areas", lines: 2 },
        { title: "Kitchen", lines: 2 },
        { title: "Bedrooms", lines: 3 },
        { title: "Bathroom / laundry", lines: 2 },
        { title: "Outdoor / garage", lines: 2 },
        { title: "Keys returned & meter readings", lines: 2 },
      ],
    },
  },
  {
    key: "bond_refund",
    title: "Bond refund / claim",
    category: "Ending the tenancy",
    type: "link",
    linkKey: "bonds",
    description: "Claim or refund the bond through the state authority.",
  },
];

export function docByKey(key: string): DocItem | undefined {
  return DOCUMENTS.find((d) => d.key === key);
}

// Map an onboarding checklist item to its document (for contextual prompts).
export function docForOnboardingKey(onboardingKey: string): DocItem | undefined {
  return DOCUMENTS.find((d) => d.onboardingKey === onboardingKey);
}
