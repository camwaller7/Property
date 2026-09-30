-- Rent-arrears workflow log. Each row records one step the manager took on a
-- tenancy's overdue rent (friendly reminder -> formal reminder -> breach/remedy
-- notice -> escalation), with the amount and days in arrears captured at the
-- time. Manager/org-only — never exposed to the tenant portal (this is the
-- landlord's internal action trail). Guidance workflow, not statutory notices.

create table if not exists public.arrears_notices (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid references public.organizations(id),
  tenancy_id       uuid references public.tenancies(id) on delete cascade,
  property_id      uuid references public.properties(id) on delete set null,
  stage            text not null,          -- reminder | second_notice | breach_notice | escalation
  amount           numeric,                -- amount in arrears when the step was taken
  days_in_arrears  integer,                -- days in arrears when the step was taken
  note             text,                   -- optional manager note (how sent, response, etc.)
  sent_on          date not null default current_date,
  created_by       uuid default auth.uid(),
  created_at       timestamptz not null default now()
);
create index if not exists arrears_notices_org_idx on public.arrears_notices(org_id);
create index if not exists arrears_notices_tenancy_idx on public.arrears_notices(tenancy_id);

alter table public.arrears_notices enable row level security;

-- Managers read/write only their own org's arrears log. No tenant path.
drop policy if exists arrears_notices_access on public.arrears_notices;
create policy arrears_notices_access on public.arrears_notices
  for all to authenticated
  using (org_id in (select public.my_org_ids()))
  with check (org_id in (select public.my_org_ids()));
