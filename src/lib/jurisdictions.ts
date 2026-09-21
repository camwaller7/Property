// Australian residential-tenancy jurisdictions. Tenancy law is state/territory
// based, so documents, authorities and bond rules are resolved per state.
//
// IMPORTANT: this is guidance, not legal advice. Authority links point to the
// official department; bond caps and notice periods are summarised and MUST be
// confirmed against the linked authority before relying on them — rules change.

export type StateCode = "NSW" | "VIC" | "QLD" | "SA" | "WA" | "TAS" | "ACT" | "NT";

export interface Link {
  name: string;
  url: string;
}

export interface Jurisdiction {
  code: StateCode;
  name: string;
  authority: Link; // consumer affairs / fair trading body
  bonds: Link; // where bonds are lodged
  tribunal: Link; // dispute tribunal
  tenantInfo: Link; // the info statement that must be given at tenancy start
  // Bond cap: weeks of rent. `threshold`/`altWeeks` express "X weeks up to a
  // weekly-rent threshold, else Y". null weeks => rule doesn't reduce to a
  // simple week multiple (confirm with the authority).
  bond: { weeks: number | null; threshold?: number; altWeeks?: number; note?: string };
  // Routine inspection notice window (days) — general guidance.
  inspection: { minNoticeDays: number; maxNoticeDays: number; note?: string };
}

export const JURISDICTIONS: Record<StateCode, Jurisdiction> = {
  NSW: {
    code: "NSW",
    name: "New South Wales",
    authority: { name: "NSW Fair Trading", url: "https://www.fairtrading.nsw.gov.au" },
    bonds: { name: "Rental Bonds Online (NSW)", url: "https://www.fairtrading.nsw.gov.au/housing-and-property/renting/rental-bonds" },
    tribunal: { name: "NCAT", url: "https://www.ncat.nsw.gov.au" },
    tenantInfo: { name: "New tenant checklist (Fair Trading)", url: "https://www.fairtrading.nsw.gov.au" },
    bond: { weeks: 4 },
    inspection: { minNoticeDays: 7, maxNoticeDays: 14 },
  },
  VIC: {
    code: "VIC",
    name: "Victoria",
    authority: { name: "Consumer Affairs Victoria", url: "https://www.consumer.vic.gov.au" },
    bonds: { name: "Residential Tenancies Bond Authority (RTBA)", url: "https://rentalbonds.vic.gov.au" },
    tribunal: { name: "VCAT", url: "https://www.vcat.vic.gov.au" },
    tenantInfo: { name: "Renting a home: a guide (CAV)", url: "https://www.consumer.vic.gov.au/housing/renting" },
    bond: { weeks: null, note: "Generally one month's rent where weekly rent is at or below the prescribed threshold — confirm with the RTBA." },
    inspection: { minNoticeDays: 7, maxNoticeDays: 14 },
  },
  QLD: {
    code: "QLD",
    name: "Queensland",
    authority: { name: "Residential Tenancies Authority (RTA)", url: "https://www.rta.qld.gov.au" },
    bonds: { name: "RTA Bonds", url: "https://www.rta.qld.gov.au/bonds" },
    tribunal: { name: "QCAT", url: "https://www.qcat.qld.gov.au" },
    tenantInfo: { name: "Pocket guide for tenants (RTA)", url: "https://www.rta.qld.gov.au" },
    bond: { weeks: 4, note: "Where weekly rent is above the prescribed threshold the maximum may differ — confirm with the RTA." },
    inspection: { minNoticeDays: 7, maxNoticeDays: 14 },
  },
  SA: {
    code: "SA",
    name: "South Australia",
    authority: { name: "Consumer and Business Services (CBS)", url: "https://www.cbs.sa.gov.au" },
    bonds: { name: "Residential Bonds (CBS)", url: "https://www.cbs.sa.gov.au/renting-a-home" },
    tribunal: { name: "SACAT", url: "https://www.sacat.sa.gov.au" },
    tenantInfo: { name: "Information for tenants (CBS)", url: "https://www.cbs.sa.gov.au/renting-a-home" },
    bond: { weeks: 4, threshold: 800, altWeeks: 6, note: "Up to 4 weeks' rent where weekly rent is $800 or less, otherwise up to 6 weeks." },
    inspection: { minNoticeDays: 7, maxNoticeDays: 28, note: "Routine inspections: up to 4 per year, 8am–8pm, not on Sundays or public holidays, max 2 hours." },
  },
  WA: {
    code: "WA",
    name: "Western Australia",
    authority: { name: "Consumer Protection (WA)", url: "https://www.commerce.wa.gov.au/consumer-protection" },
    bonds: { name: "Bond Administrator (WA)", url: "https://www.commerce.wa.gov.au/consumer-protection/renting-home" },
    tribunal: { name: "Magistrates Court of WA", url: "https://www.magistratescourt.wa.gov.au" },
    tenantInfo: { name: "Renting a home (Consumer Protection)", url: "https://www.commerce.wa.gov.au/consumer-protection/renting-home" },
    bond: { weeks: 4, note: "Plus a pet bond where applicable — confirm with Consumer Protection." },
    inspection: { minNoticeDays: 7, maxNoticeDays: 14 },
  },
  TAS: {
    code: "TAS",
    name: "Tasmania",
    authority: { name: "Consumer, Building and Occupational Services (CBOS)", url: "https://www.cbos.tas.gov.au" },
    bonds: { name: "Rental Deposit Authority (CBOS)", url: "https://www.cbos.tas.gov.au/topics/housing/renting" },
    tribunal: { name: "Residential Tenancy Commissioner / Magistrates Court", url: "https://www.cbos.tas.gov.au" },
    tenantInfo: { name: "Renting information (CBOS)", url: "https://www.cbos.tas.gov.au/topics/housing/renting" },
    bond: { weeks: 4 },
    inspection: { minNoticeDays: 7, maxNoticeDays: 14 },
  },
  ACT: {
    code: "ACT",
    name: "Australian Capital Territory",
    authority: { name: "Access Canberra", url: "https://www.accesscanberra.act.gov.au" },
    bonds: { name: "ACT Rental Bonds (Access Canberra)", url: "https://www.accesscanberra.act.gov.au" },
    tribunal: { name: "ACAT", url: "https://www.acat.act.gov.au" },
    tenantInfo: { name: "Renting a home (Access Canberra)", url: "https://www.accesscanberra.act.gov.au" },
    bond: { weeks: 4 },
    inspection: { minNoticeDays: 7, maxNoticeDays: 14 },
  },
  NT: {
    code: "NT",
    name: "Northern Territory",
    authority: { name: "NT Consumer Affairs", url: "https://consumeraffairs.nt.gov.au" },
    bonds: { name: "Security deposits (NT Consumer Affairs)", url: "https://consumeraffairs.nt.gov.au" },
    tribunal: { name: "NTCAT", url: "https://ntcat.nt.gov.au" },
    tenantInfo: { name: "Renting information (NT Consumer Affairs)", url: "https://consumeraffairs.nt.gov.au" },
    bond: { weeks: 4 },
    inspection: { minNoticeDays: 7, maxNoticeDays: 14 },
  },
};

export const STATE_CODES = Object.keys(JURISDICTIONS) as StateCode[];

export function jurisdiction(state: string | null | undefined): Jurisdiction | null {
  if (!state) return null;
  return JURISDICTIONS[state as StateCode] ?? null;
}

// State-aware bond cap. Returns the maximum bond in dollars, or null when the
// rule can't be reduced to a simple multiple (UI then says "confirm").
export function maxBond(weeklyRent: number | null | undefined, state: string | null | undefined): number | null {
  if (weeklyRent == null || Number.isNaN(Number(weeklyRent))) return null;
  const j = jurisdiction(state);
  if (!j || j.bond.weeks == null) return null;
  const rent = Number(weeklyRent);
  const weeks =
    j.bond.threshold != null && j.bond.altWeeks != null && rent > j.bond.threshold
      ? j.bond.altWeeks
      : j.bond.weeks;
  return rent * weeks;
}
