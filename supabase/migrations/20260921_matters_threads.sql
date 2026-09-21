-- MATTERS + THREADS (applied to tioeqxdulxqiptlszldp 2026-09-21; two-sided flow
-- verified). maintenance_requests gains `kind` (maintenance|enquiry|complaint|
-- communication); matter_messages is a shared two-sided thread per matter.
-- Tenant posts/reads by token via portal_submit_request (now 7 args incl kind),
-- portal_add_message, and portal_get (now returns kind + messages per matter).
-- See the applied migration record for the full function bodies.

alter table public.maintenance_requests add column if not exists kind text not null default 'maintenance';

create table if not exists public.matter_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.maintenance_requests(id) on delete cascade,
  org_id uuid references public.organizations(id),
  author text not null default 'manager',
  body text,
  status_change text,
  created_at timestamptz not null default now()
);
create index if not exists matter_messages_request_idx on public.matter_messages(request_id, created_at);

alter table public.matter_messages enable row level security;
create policy matter_messages_org on public.matter_messages
  for all to authenticated
  using (org_id in (select public.my_org_ids()))
  with check (org_id in (select public.my_org_ids()));

drop trigger if exists set_org_id_trg on public.matter_messages;
create trigger set_org_id_trg before insert on public.matter_messages
  for each row execute function public.set_org_id();

-- portal_submit_request(7 args, incl kind), portal_add_message(token,request,body)
-- and portal_get(with kind+messages) are defined in the applied migration.
