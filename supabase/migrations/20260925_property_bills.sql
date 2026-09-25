-- Recurring property outgoings: council rates, water, insurance, etc. Each is a
-- per-property entry with an amount, a cycle and a next-due date; the app
-- projects future occurrences into the landlord's calendar + dashboard. `payer`
-- marks who bears it — landlord-paid (rates) vs recoverable from the tenant
-- (water). Landlord-only data; never exposed to the tenant portal.
-- Applied to project tioeqxdulxqiptlszldp 2026-09-25.

create table if not exists public.property_bills (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid references public.organizations(id),
  property_id uuid references public.properties(id) on delete cascade,
  kind        text not null default 'other',   -- council_rates | water | insurance | strata | land_tax | other
  label       text,
  amount      numeric,
  frequency   text not null default 'quarterly', -- quarterly | annual | monthly
  next_due    date,
  payer       text not null default 'landlord',  -- landlord | tenant
  notes       text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists property_bills_org_idx on public.property_bills(org_id);
create index if not exists property_bills_property_idx on public.property_bills(property_id);

alter table public.property_bills enable row level security;
drop policy if exists property_bills_org on public.property_bills;
create policy property_bills_org on public.property_bills
  for all to authenticated
  using (org_id in (select public.my_org_ids()))
  with check (org_id in (select public.my_org_ids()));

drop trigger if exists set_org_id_trg on public.property_bills;
create trigger set_org_id_trg before insert on public.property_bills
  for each row execute function public.set_org_id();
