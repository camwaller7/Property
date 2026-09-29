# Document & requirements audit — Corvelle Property

_Last updated: 2026-09-28_

**Purpose.** Compare every document, form, checklist and requirement we've built
against what established Australian property managers and the state authorities
actually use, and flag what's missing. Nothing here is invented — it's drawn
from the state consumer authorities (CBS SA, NSW Fair Trading, Consumer
Protection WA, Consumer Affairs Vic), tenants' unions, the major agencies'
public screening guides (LJ Hooker, The Agency, Harcourts, Rent360) and the
compliance-inspection industry. Sources are listed at the end.

**How to read the status column:** ✅ have it · 🟡 partial / needs work · ❌ missing.

> Everything we generate remains a *draft to review, not legal advice*. State
> variance is real: the prescribed **forms and notice periods differ per
> state/territory**, so several items below can only be finished once each
> state's data is verified (see `docs/TODO.md` 🅱 "verify all 8 states").

---

## 1. What we have today (inventory)

**Tenant application** (`src/lib/application-schema.ts`) — personal details + ID
type/number, employment & income (incl. gross weekly income), household &
pets, emergency contact, repeatable rental history, ≥2 references, document
uploads (photo ID ✓req, proof of income ✓req, rental reference ○optional),
declarations (info true + consent to checks).

**Document catalog** (`src/lib/documents.ts`) — Tenancy Agreement (generated),
Tenant information statement (link), Ingoing condition report (template), Bond
lodgement (link), Rent/direct-debit authority (template), Tenant handbook
(generated), Emergency & maintenance contacts (template), Smoke alarm
compliance record (template); Notice of entry, Rent increase notice, Breach
notice; Notice to vacate, Outgoing condition report, Bond refund/claim.

**Generated Tenancy Agreement clauses** — Parties, Premises, Term, Rent, Bond,
Emergency contact, Special terms, Signatures.

**Generated Tenant Handbook** — Welcome, Key contacts, Rent, Repairs &
maintenance, Inspections, Your responsibilities, Ending the tenancy.

**Checklists** — tenant clean-up-before-inspection list; new landlord ingoing
condition **photo** checklist mapped to the SA CBS Inspection Sheet.

**Inspections** — entry/routine/exit scheduling, auto-quarterly routine
inspections, 30/14/3-day reminders (portal + calendar + email cron).

---

## 2. Start-of-tenancy — what a landlord must hand over

Industry/legal standard (NSW shown; other states vary): at or before signing the
tenant must be given the **information statement**, a copy of the **agreement**,
**two copies (or one electronic) of the condition report**, **strata by-laws**
if applicable, a **bond-lodgement invitation**, **swimming/spa pool compliance
certificate**, and the **landlord's name + direct contact**.

| Item | Status | Notes |
|---|---|---|
| Information statement | ✅ | Link, per jurisdiction. |
| Tenancy agreement copy | ✅ | Generated. |
| Condition report (2 copies / electronic) | 🟡 | We have the template + new photo checklist, but no "issued to tenant, X copies, signed & acknowledged" tracking, and no tenant counter-sign in the portal. |
| Strata / community by-laws | ❌ | Not collected or issued. Needed for any strata property. |
| Bond-lodgement invitation | ✅ | Link. |
| **Pool/spa compliance certificate** | ❌ | Legally required to hand over where a pool exists; not modelled. |
| Landlord name + direct contact | 🟡 | Portal shows the managing org + owner email; no explicit "landlord legal name & service address" record. |

---

## 3. Tenant application & screening

Agency standard: **100 points of ID**, rent ≤ ~30–35% of **verified** gross
income, **at least 2 prior-landlord references independently verified**
(earlier landlords, not just the current one), plus **credit / tenancy-database
(e.g. NTD/TICA) / background** checks, run identically for every applicant.

| Item | Status | Notes |
|---|---|---|
| Identity capture | 🟡 | We take ID type + number + a photo-ID upload, but not a **100-point breakdown**. |
| Income vs rent affordability | 🟡 | We capture gross weekly income; we don't compute/flag the **rent-to-income ratio** for the manager. |
| Rental history | ✅ | Repeatable, with reason for leaving. |
| References | ✅ | ≥2 enforced. Consider ≥1 must be a **prior managing agent/landlord**. |
| Consent to checks | ✅ | Declaration present. |
| **Credit / tenancy-database check record** | ❌ | No field to record a check was run or its outcome (NTD/TICA/Equifax). |
| **Reference-check call script + result capture** | ❌ | No structured "what type of tenant / paid on time / bond returned in full?" record against the application. |
| **Pets — assistance-animal distinction & pet bond/agreement** | 🟡 | We capture pet details but no pet agreement / assistance-animal handling. |
| **Identity verification audit (who/when reviewed)** | ❌ | No reviewer stamp on the decision. |

---

## 4. The tenancy agreement (generated lease)

Standard residential agreements carry materially more than our 8 clauses. Gaps
against the common prescribed-agreement structure:

| Clause | Status | Notes |
|---|---|---|
| Parties / Premises / Term / Rent / Bond / Signatures | ✅ | Present. |
| **Rent — method, frequency, place, increase rules** | 🟡 | Amount only; no payment method/reference or increase-notice terms in the body. |
| **Inclusions list** (furniture, appliances, remotes, keys issued) | ❌ | No itemised inclusions schedule. |
| **Occupants named** (who may live there) | 🟡 | We have lease_tenants but they aren't written into the agreement body. |
| **Pets clause** | ❌ | Not in the lease. |
| **Water usage / utilities responsibility** | ❌ | Who pays water/usage, separately-metered, other utilities — not stated. |
| **Repairs & urgent-repairs process + nominated tradespeople** | 🟡 | In the handbook, not the binding agreement. |
| **Access / entry rights & notice** | 🟡 | Handbook only. |
| **Smoke-alarm / safety obligations** | ❌ | Not a clause. |
| **Subletting / assignment, ending, break-lease costs** | 🟡 | Handbook mentions ending; no break-lease/assignment terms. |
| **Special conditions schedule** | ✅ | Present (free text). |
| **Strata by-laws acknowledgement** | ❌ | — |

---

## 5. During-tenancy notices & records

| Item | Status | Notes |
|---|---|---|
| Entry / inspection notice | ✅ | Template. |
| Rent increase notice | ✅ | Template. |
| Breach / notice to remedy | ✅ | Template. |
| **Rent ledger** (every payment, running balance, arrears) | 🟡 | We record payments and mark paid, but there's no **formal ledger view/export** a tenant/tribunal expects (must be providable within 7 days). |
| **Routine inspection report** (findings, photos, tenant copy) | 🟡 | We schedule/track inspections and have a photo checklist, but no **written routine-inspection report** output with findings + photos sent to owner/tenant. |
| **Arrears / late-rent process** (reminder → breach → termination timeline) | ❌ | No guided arrears workflow. |
| **Maintenance work order / trades record** | 🟡 | Matters thread exists; no work-order doc, quote/approval, or invoice record. |
| **Rent-increase frequency guardrail** | ❌ | No check against per-state min interval/notice. |

---

## 6. Ending a tenancy

| Item | Status | Notes |
|---|---|---|
| Notice to vacate / termination | ✅ | Template. |
| Outgoing condition report | ✅ | Template (compares to ingoing). |
| Bond refund / claim | ✅ | Link. |
| **Final rent / water reconciliation & final ledger** | ❌ | No end-of-tenancy statement. |
| **Bond-claim itemisation** (cleaning/damage vs fair wear & tear, with photos) | 🟡 | End-tenancy snapshot exists; no itemised claim doc. |
| **Break-lease / reletting cost calculation** | ❌ | — |

---

## 7. Compliance & safety register — **biggest gap**

This is where established agencies do the most and we do the least. Landlords
must keep safety compliance current and **retain records ~7 years**; cadence
varies by state but the common baseline is:

- **Smoke alarms** — check/test at least annually (VIC: full annual test;
  QLD: interconnected photoelectric in every bedroom + hallway; each state differs).
- **Gas safety** — licensed check ~every 2 years.
- **Electrical safety** — licensed check ~every 2 years.
- **Pool/spa fencing** — compliance certificate.
- **Corded blinds** — anchored/compliant.
- **Minimum housing standards** — heating, ventilation, locks, etc. (VIC has a
  prescribed list; others catching up).

| Item | Status | Notes |
|---|---|---|
| Smoke alarm record | 🟡 | A template exists, but it's not a **recurring, reminded compliance schedule** with due dates + certificate storage. |
| Gas safety check schedule | ❌ | Not modelled. |
| Electrical safety check schedule | ❌ | Not modelled. |
| Pool/spa compliance | ❌ | Not modelled. |
| Blind-cord / minimum-standards checklist | ❌ | Not modelled. |
| **Compliance dashboard** (what's due, what's overdue, per property, 7-yr history) | ❌ | The single highest-value missing module. |

*(`docs/TODO.md` 🅱 already lists a "Compliance schedule" — this audit promotes it and defines its contents.)*

---

## 8. Landlord / owner side (agency-grade)

| Item | Status | Notes |
|---|---|---|
| **Management agreement** (owner ↔ manager, fees, authority) | ❌ | Not modelled — needed the moment this manages someone else's property. |
| **Landlord insurance record** (policy, expiry, PDS) | ❌ | Not tracked. |
| **Key register** (sets cut, issued, returned) | 🟡 | Keys appear on the photo checklist; no persistent register. |
| **Owner statement / disbursement** (rent in, fees, net to owner) | ❌ | No monthly owner statement. |
| **Landlord disclosure statements** (material facts, e.g. flooding, prior death — varies by state) | ❌ | Not modelled. |
| **Emergency-contacts sheet** | ✅ | Template. |

---

## 9. Prioritised gap list (recommended build order)

**P1 — legal-must for real use (highest risk if missing):**
1. **Compliance & safety register + reminders** (smoke/gas/electrical/pool/blind
   cords) with per-property due dates, certificate storage and 7-year history. §7
2. **Condition report: issued/acknowledged tracking + tenant portal
   counter-sign** (the document a bond claim rests on). §2, §6
3. **Pool/spa & strata by-laws** capture + hand-over tracking. §2
4. **Landlord legal name + service address** as a first-class record. §2

**P2 — strong best-practice, buildable now:**
5. **Rent ledger view + export** (per tenancy, running balance, arrears; 7-day
   provision). §5
6. **Routine inspection report output** (findings + photos → owner/tenant). §5
7. **Fuller lease clauses**: inclusions schedule, occupants, pets, water/utilities,
   safety, break-lease/assignment. §4
8. **Screening depth**: rent-to-income flag, credit/tenancy-database result
   field, structured reference-check capture. §3
9. **Arrears workflow** (reminder → breach → notice timeline). §5

**P3 — agency-grade / as you take on other owners:**
10. Management agreement, owner statements/disbursements, landlord insurance
    record, key register, disclosure statements. §8

---

## 10. What I can build without you vs. what needs per-state data

- **No per-state data needed (I can build now):** compliance register + reminders
  scaffold, rent ledger view/export, routine inspection report, condition-report
  acknowledgement, key register, richer application fields, fuller lease clause
  bodies, owner statement.
- **Needs each state's verified rules first:** exact safety cadences, prescribed
  notice periods/forms, minimum-standards lists, disclosure obligations — these
  ride on the `jurisdictions.ts` per-state verification already on the pre-public
  list.

---

## Sources
- NSW Government — [Information a tenant should get at the start of a tenancy](https://www.nsw.gov.au/housing-and-construction/rules/information-a-tenant-should-get-at-start-of-a-tenancy), [Residential tenancy agreements](https://www.nsw.gov.au/housing-and-construction/rules/residential-tenancy-agreements)
- Tenants' Union — [Starting a tenancy](https://www.tenants.org.au/factsheet-starting-a-tenancy)
- Consumer Protection WA — [Rent agreement (form 1AA)](https://www.consumerprotection.wa.gov.au/publications/rent-agreement-form-1aa)
- CBS SA — [Inspection Sheet (condition report)](https://cbs.sa.gov.au/documents/tenancy/forms/Inspection_sheet.pdf)
- The Agency — [8-step tenancy screening process](https://theagency.com.au/post/614/8-step-tenancy-screening-process-that-benefits-landlords); LJ Hooker — [How to screen tenants](https://www.ljhooker.com.au/blog/how-to-screen-tenants); Rent360 — [How to screen potential tenants](https://rent360.com.au/how-to-screen-potential-tenants/); RealHelp — [Tenant screening checklist NSW](https://www.realhelp.com.au/tenant-screening-checklist-nsw-landlords/)
- Rental Safety Inspections — [Landlord safety obligations Australia](https://rentalsafetyinspections.com.au/landlord-safety-obligations-australia/); Tenants Victoria — [Safety requirements](https://tenantsvic.org.au/explore-topics/during-your-tenancy/safety-requirements/); Property Compliance Australia — [Compliance obligations explained](https://propertycompliance.com.au/landlords/compliance-explained/)
- Rent.com.au — [What is a rental ledger](https://www.rent.com.au/blog/rental-ledger); PropertyNow — [Routine rental inspections + rules by state](https://www.propertynow.com.au/blog/routine-rental-inspections/)
