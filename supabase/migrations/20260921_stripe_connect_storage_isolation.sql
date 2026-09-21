-- STRIPE CONNECT + STORAGE ISOLATION (applied to tioeqxdulxqiptlszldp 2026-09-21)
--
-- Connect: organizations.stripe_account_id + stripe_charges_enabled. Rent is
-- charged on the landlord's connected account (see /api/rent/checkout). RPCs
-- extended: portal_payment_for_checkout returns the org's connect status;
-- onboard_get and portal_get expose org_id so uploads are namespaced per org.
alter table public.organizations add column if not exists stripe_account_id text;
alter table public.organizations add column if not exists stripe_charges_enabled boolean not null default false;

-- Storage isolation: sensitive buckets are readable only by the owning org.
-- Files are stored as <org_id>/... ; authenticated reads/writes are limited to
-- the caller's org(s) by matching the first path segment against my_org_ids().
-- Anon INSERT stays open for tenant uploads; anon cannot read.
--
--   tenant-documents  : private, org-scoped select/update/delete
--   maintenance-photos: private, org-scoped select/delete
--   tenant-resources  : public read (non-sensitive handouts), org-scoped write
--
-- See the applied migration record for the full policy bodies (helpers:
-- storage.foldername(name)[1] = any(my_org_ids())).
