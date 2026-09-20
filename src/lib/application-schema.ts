// Single source of truth for the tenant application: it drives the public
// onboarding form, the "no missing info" validation, and the owner-side
// read-only summary. Change a field here and all three stay in sync.

export type FieldType = "text" | "email" | "tel" | "date" | "number" | "select" | "textarea";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  help?: string;
  full?: boolean; // span both columns
}

export interface SectionDef {
  key: string;
  title: string;
  description?: string;
  fields: FieldDef[];
}

// Flat sections (one value per field).
export const SECTIONS: SectionDef[] = [
  {
    key: "personal",
    title: "Personal details",
    fields: [
      { key: "full_legal_name", label: "Full legal name", type: "text", required: true, full: true },
      { key: "preferred_name", label: "Preferred name", type: "text" },
      { key: "date_of_birth", label: "Date of birth", type: "date", required: true },
      { key: "email", label: "Email", type: "email", required: true },
      { key: "phone", label: "Mobile phone", type: "tel", required: true },
      { key: "current_address", label: "Current residential address", type: "text", required: true, full: true },
      { key: "id_type", label: "ID type", type: "select", required: true, options: ["Driver licence", "Passport", "Proof of Age card"] },
      { key: "id_number", label: "ID number", type: "text", required: true },
    ],
  },
  {
    key: "employment",
    title: "Employment & income",
    fields: [
      { key: "employment_status", label: "Employment status", type: "select", required: true, options: ["Employed full-time", "Employed part-time", "Casual", "Self-employed", "Student", "Retired", "Unemployed"] },
      { key: "occupation", label: "Occupation", type: "text", required: true },
      { key: "employer_name", label: "Employer / business name", type: "text", required: true },
      { key: "employer_contact", label: "Employer contact", type: "tel" },
      { key: "gross_weekly_income", label: "Gross weekly income ($)", type: "number", required: true },
    ],
  },
  {
    key: "household",
    title: "Household",
    fields: [
      { key: "num_occupants", label: "Total occupants (incl. you)", type: "number", required: true },
      { key: "has_pets", label: "Any pets?", type: "select", required: true, options: ["No", "Yes"] },
      { key: "pet_details", label: "Pet details (type, breed, number)", type: "textarea", full: true, help: "Required if you have pets." },
    ],
  },
  {
    key: "emergency",
    title: "Emergency contact",
    fields: [
      { key: "emergency_name", label: "Contact name", type: "text", required: true },
      { key: "emergency_relationship", label: "Relationship", type: "text", required: true },
      { key: "emergency_phone", label: "Contact phone", type: "tel", required: true },
    ],
  },
];

// Repeatable: rental history entries.
export const RENTAL_FIELDS: FieldDef[] = [
  { key: "address", label: "Property address", type: "text", required: true, full: true },
  { key: "landlord_or_agent", label: "Landlord / agent name", type: "text", required: true },
  { key: "contact_phone", label: "Landlord / agent phone", type: "tel", required: true },
  { key: "rent_per_week", label: "Rent per week ($)", type: "number" },
  { key: "start_date", label: "From", type: "date", required: true },
  { key: "end_date", label: "To", type: "date" },
  { key: "reason_for_leaving", label: "Reason for leaving", type: "text", required: true, full: true },
];

// Repeatable: references (min 2).
export const REFERENCE_FIELDS: FieldDef[] = [
  { key: "name", label: "Name", type: "text", required: true },
  { key: "relationship", label: "Relationship", type: "text", required: true },
  { key: "phone", label: "Phone", type: "tel", required: true },
  { key: "email", label: "Email", type: "email" },
];

export const MIN_REFERENCES = 2;

export interface DocRequirement {
  kind: string;
  label: string;
  required: boolean;
  accept: string;
  help?: string;
}

export const DOCUMENTS: DocRequirement[] = [
  { kind: "photo_id", label: "Photo ID", required: true, accept: "image/*,.pdf", help: "Driver licence or passport." },
  { kind: "proof_of_income", label: "Proof of income", required: true, accept: "image/*,.pdf", help: "Recent payslip, bank statement or Centrelink statement." },
  { kind: "rental_reference", label: "Rental ledger / reference letter", required: false, accept: "image/*,.pdf" },
];

export interface DeclarationDef {
  key: string;
  label: string;
}

export const DECLARATIONS: DeclarationDef[] = [
  { key: "info_true", label: "I declare the information I have provided is true and correct." },
  { key: "consent_checks", label: "I consent to rental history, reference and background checks being conducted." },
];

// A blank application-data object.
export type ApplicationData = Record<string, unknown> & {
  rental_history?: Record<string, string>[];
  references?: Record<string, string>[];
  first_time_renter?: boolean;
  declarations?: Record<string, boolean>;
};

export function createInitialData(): ApplicationData {
  return {
    rental_history: [{}],
    references: [{}, {}],
    first_time_renter: false,
    declarations: {},
  };
}

function isBlank(v: unknown): boolean {
  return v === undefined || v === null || String(v).trim() === "";
}

// Returns a list of human-readable problems. Empty = ready to submit.
export function validateApplication(
  data: ApplicationData,
  uploadedKinds: Set<string>
): string[] {
  const problems: string[] = [];

  for (const section of SECTIONS) {
    for (const f of section.fields) {
      if (f.required && isBlank(data[f.key])) {
        problems.push(`${section.title}: ${f.label} is required.`);
      }
    }
  }
  // Conditional: pet details required when has_pets = Yes.
  if (data.has_pets === "Yes" && isBlank(data.pet_details)) {
    problems.push("Household: Pet details are required when you have pets.");
  }

  // Rental history (unless first-time renter).
  if (!data.first_time_renter) {
    const entries = data.rental_history || [];
    if (entries.length === 0) {
      problems.push("Rental history: add at least one previous or current tenancy (or tick “first-time renter”).");
    }
    entries.forEach((entry, i) => {
      for (const f of RENTAL_FIELDS) {
        if (f.required && isBlank(entry[f.key])) {
          problems.push(`Rental history #${i + 1}: ${f.label} is required.`);
        }
      }
    });
  }

  // References.
  const refs = data.references || [];
  const completeRefs = refs.filter((r) => REFERENCE_FIELDS.every((f) => !f.required || !isBlank(r[f.key])));
  if (completeRefs.length < MIN_REFERENCES) {
    problems.push(`References: provide at least ${MIN_REFERENCES} complete references.`);
  }

  // Documents.
  for (const d of DOCUMENTS) {
    if (d.required && !uploadedKinds.has(d.kind)) {
      problems.push(`Documents: ${d.label} must be uploaded.`);
    }
  }

  // Declarations.
  for (const d of DECLARATIONS) {
    if (!data.declarations?.[d.key]) {
      problems.push(`Declarations: you must agree to “${d.label}”.`);
    }
  }

  return problems;
}
