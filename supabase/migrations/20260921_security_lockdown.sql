-- SECURITY LOCKDOWN (applied to project tioeqxdulxqiptlszldp on 2026-09-21)
-- 1. Public token flows move to SECURITY DEFINER RPCs (token-scoped, no table enumeration).
-- 2. Manager workspace requires Supabase Auth -> tables become authenticated-only.
-- 3. anon can ONLY: call the RPCs below, and upload documents during onboarding.
-- Verified server-side: anon has no table policies; the 4 RPCs are SECURITY
-- DEFINER and anon-executable.

-- ---- Onboarding RPCs -------------------------------------------------------
create or replace function public.onboard_get(p_token text)
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'id', a.id, 'tenancy_id', a.tenancy_id, 'token', a.token, 'status', a.status,
    'data', a.data, 'documents', a.documents, 'property_address', p.address)
  from tenant_applications a
  left join tenancies t on t.id = a.tenancy_id
  left join properties p on p.id = t.property_id
  where a.token = p_token;
$$;

create or replace function public.onboard_submit(p_token text, p_data jsonb, p_documents jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_app tenant_applications;
begin
  select * into v_app from tenant_applications where token = p_token;
  if not found then return jsonb_build_object('error','not_found'); end if;
  if v_app.status = 'submitted' then return jsonb_build_object('error','already_submitted'); end if;
  update tenant_applications
     set data = p_data, documents = p_documents, status = 'submitted', submitted_at = now()
   where token = p_token;
  if v_app.tenancy_id is not null then
    update tenancies set
      tenant_name  = coalesce(nullif(p_data->>'full_legal_name',''), tenant_name),
      tenant_email = coalesce(nullif(p_data->>'email',''), tenant_email),
      tenant_phone = coalesce(nullif(p_data->>'phone',''), tenant_phone),
      emergency_contact = coalesce(nullif(trim(concat_ws(' ',
        p_data->>'emergency_name',
        case when coalesce(p_data->>'emergency_relationship','') <> ''
             then '('||(p_data->>'emergency_relationship')||')' end,
        p_data->>'emergency_phone')), ''), emergency_contact)
    where id = v_app.tenancy_id;
  end if;
  return jsonb_build_object('ok', true);
end; $$;

-- ---- Portal RPC ------------------------------------------------------------
create or replace function public.portal_get(p_token text)
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'tenancy', jsonb_build_object('id', t.id, 'tenant_name', t.tenant_name,
      'weekly_rent', t.weekly_rent, 'property_id', t.property_id),
    'property', (select jsonb_build_object('address', p.address, 'weekly_rent', p.weekly_rent,
      'rent_due_day', p.rent_due_day) from properties p where p.id = t.property_id),
    'notices', coalesce((select jsonb_agg(to_jsonb(n) order by n.created_at desc) from notices n
      where n.tenancy_id = t.id or (n.tenancy_id is null and n.property_id = t.property_id)
         or (n.tenancy_id is null and n.property_id is null)), '[]'::jsonb),
    'resources', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from portal_resources r
      where r.property_id is null or r.property_id = t.property_id), '[]'::jsonb),
    'payments', coalesce((select jsonb_agg(to_jsonb(pay)) from payments pay
      where pay.property_id = t.property_id), '[]'::jsonb))
  from tenancies t where t.portal_token = p_token;
$$;

-- ---- Email logging RPC (server email route runs as anon) -------------------
create or replace function public.log_email(p_tenancy_id uuid, p_to text, p_subject text,
  p_body text, p_status text, p_error text)
returns void language sql security definer set search_path = public as $$
  insert into public.email_log (tenancy_id, to_email, subject, body, status, error)
  values (p_tenancy_id, p_to, p_subject, p_body, p_status, p_error);
$$;

revoke all on function public.onboard_get(text) from public;
revoke all on function public.onboard_submit(text, jsonb, jsonb) from public;
revoke all on function public.portal_get(text) from public;
revoke all on function public.log_email(uuid, text, text, text, text, text) from public;
grant execute on function public.onboard_get(text) to anon, authenticated;
grant execute on function public.onboard_submit(text, jsonb, jsonb) to anon, authenticated;
grant execute on function public.portal_get(text) to anon, authenticated;
grant execute on function public.log_email(uuid, text, text, text, text, text) to anon, authenticated;

-- ---- Table RLS: authenticated-only ----------------------------------------
drop policy if exists "anon full access properties" on public.properties;
drop policy if exists "anon full access payments"   on public.payments;
drop policy if exists tenancies_anon_all             on public.tenancies;
drop policy if exists inspections_anon_all           on public.inspections;
drop policy if exists tenant_applications_anon_all   on public.tenant_applications;
drop policy if exists notices_anon_all               on public.notices;
drop policy if exists portal_resources_anon_all      on public.portal_resources;
drop policy if exists email_log_anon_all             on public.email_log;

create policy properties_auth_all          on public.properties          for all to authenticated using (true) with check (true);
create policy payments_auth_all            on public.payments            for all to authenticated using (true) with check (true);
create policy tenancies_auth_all           on public.tenancies           for all to authenticated using (true) with check (true);
create policy inspections_auth_all         on public.inspections         for all to authenticated using (true) with check (true);
create policy tenant_applications_auth_all on public.tenant_applications for all to authenticated using (true) with check (true);
create policy notices_auth_all             on public.notices             for all to authenticated using (true) with check (true);
create policy portal_resources_auth_all    on public.portal_resources    for all to authenticated using (true) with check (true);
create policy email_log_auth_all           on public.email_log           for all to authenticated using (true) with check (true);

-- ---- Storage ---------------------------------------------------------------
-- tenant-documents: private. anon INSERT (applicant upload) kept; anon read removed;
-- authenticated full (manager views via signed URLs).
drop policy if exists "tenant docs anon select" on storage.objects;
drop policy if exists "tenant docs auth all"    on storage.objects;
create policy "tenant docs auth all" on storage.objects
  for all to authenticated using (bucket_id = 'tenant-documents') with check (bucket_id = 'tenant-documents');

-- tenant-resources: public bucket; authenticated-managed.
update storage.buckets set public = true where id = 'tenant-resources';
drop policy if exists "tenant resources anon insert" on storage.objects;
drop policy if exists "tenant resources anon select" on storage.objects;
drop policy if exists "tenant resources auth all"    on storage.objects;
create policy "tenant resources auth all" on storage.objects
  for all to authenticated using (bucket_id = 'tenant-resources') with check (bucket_id = 'tenant-resources');
