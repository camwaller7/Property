-- Generalise the renovation-specific cost table into a property cost tracker
-- (applied to tioeqxdulxqiptlszldp 2026-09-22; tables were empty).
-- Costs are logged directly against a property and categorised as
-- holding | maintenance | improvement, used for analytics + the tax split.

-- Drop the project linkage (costs no longer require a renovation project).
alter table public.renovation_costs drop column if exists project_id;

-- Swap the category scheme (remap any legacy values first).
alter table public.renovation_costs drop constraint if exists renovation_costs_category_check;
update public.renovation_costs set category = case
  when category in ('capital_works','depreciable') then 'improvement'
  when category = 'repairs' then 'maintenance'
  else 'holding'
end
where category not in ('holding','maintenance','improvement');

-- Rename to a generic name (RLS policy, set_org_id trigger and indexes follow it).
alter table public.renovation_costs rename to property_costs;

alter table public.property_costs
  add constraint property_costs_category_check
  check (category in ('holding','maintenance','improvement'));
alter table public.property_costs alter column category set default 'maintenance';

-- Tidy the policy name (functionally unchanged: org_id in my_org_ids()).
alter policy renovation_costs_org on public.property_costs rename to property_costs_org;

-- Remove the now-unused renovation projects table.
drop table if exists public.renovation_projects cascade;

-- Note: the private receipts bucket is still `renovation-receipts` (internal id,
-- never shown to users); it now stores cost receipts.
