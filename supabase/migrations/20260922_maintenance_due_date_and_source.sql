-- Outstanding tasks register: managers can raise their own tasks (repairs,
-- inspections, compliance, admin) alongside tenant-submitted matters, and give
-- any matter a due date so it surfaces on the property calendar.

alter table public.maintenance_requests
  add column if not exists due_date date,
  add column if not exists source text not null default 'tenant';

-- 'tenant' = raised via the portal; 'manager' = raised in the workspace.
alter table public.maintenance_requests
  drop constraint if exists maintenance_requests_source_check;
alter table public.maintenance_requests
  add constraint maintenance_requests_source_check
  check (source in ('tenant', 'manager'));
