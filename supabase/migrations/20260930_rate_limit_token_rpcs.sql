-- Extend the fixed-window rate limiter (rate_limit_touch) to the token-scoped /
-- manager SECURITY DEFINER RPCs that anon/authenticated call directly over
-- PostgREST, so a caller can't hammer them. Each function is recreated verbatim
-- with a guard added at the top; nothing else changes (grants are preserved by
-- CREATE OR REPLACE). rate_limit_touch is service-role/postgres-only, but these
-- are SECURITY DEFINER owned by postgres, so the internal call runs as the
-- owner. Over-limit returns the same jsonb {error: ...} shape the callers already
-- handle. Keyed per the natural principal: the token for the public endpoints,
-- the org for the manager action (so it can't be side-stepped per-email).
--
-- Applied to project tioeqxdulxqiptlszldp 2026-09-30.

-- Onboarding submission (public application token). A legit applicant submits
-- once; 10/hour per token leaves slack for retries but stops flooding.
create or replace function public.onboard_submit(p_token text, p_data jsonb, p_documents jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_app tenant_applications;
begin
  if not public.rate_limit_touch('onboard_submit:' || coalesce(p_token,''), 10, 3600) then
    return jsonb_build_object('error','rate_limited');
  end if;
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
  insert into public.notifications (org_id, type, title, body, link, entity_id)
  values (v_app.org_id, 'application',
          'Application submitted: ' || coalesce(p_data->>'full_legal_name','a tenant'),
          'A tenant onboarding application was completed.', '/app/management', v_app.id);
  return jsonb_build_object('ok', true);
end; $function$;

-- Tenant portal maintenance/request submission (portal token). A tenant may file
-- a few; 20/hour per token is generous but bounds abuse of a leaked token.
create or replace function public.portal_submit_request(p_token text, p_category text, p_title text, p_description text, p_urgency text, p_photo_path text, p_kind text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_ten public.tenancies; v_req uuid;
begin
  if not public.rate_limit_touch('portal_submit:' || coalesce(p_token,''), 20, 3600) then
    return jsonb_build_object('error','rate_limited');
  end if;
  select * into v_ten from public.tenancies where portal_token = p_token;
  if not found then return jsonb_build_object('error','not_found'); end if;
  if coalesce(trim(p_title),'') = '' then return jsonb_build_object('error','title_required'); end if;
  insert into public.maintenance_requests
    (org_id, tenancy_id, property_id, kind, category, title, description, urgency, photo_path)
  values
    (v_ten.org_id, v_ten.id, v_ten.property_id, coalesce(nullif(p_kind,''),'maintenance'),
     coalesce(nullif(p_category,''),'General'), p_title, p_description,
     coalesce(nullif(p_urgency,''),'normal'), p_photo_path)
  returning id into v_req;
  if coalesce(trim(p_description),'') <> '' then
    insert into public.matter_messages (request_id, org_id, author, body)
    values (v_req, v_ten.org_id, 'tenant', p_description);
  end if;
  insert into public.notifications (org_id, type, title, body, link, entity_id)
  values (v_ten.org_id, coalesce(nullif(p_kind,''),'maintenance'),
          'New ' || coalesce(nullif(p_kind,''),'maintenance') || ': ' || p_title,
          coalesce(v_ten.tenant_name,'A tenant') || ' submitted a ' || coalesce(nullif(p_category,''),'general') || ' matter.',
          '/app/management', v_req);
  return jsonb_build_object('ok', true);
end; $function$;

-- Manager requests a prospective tenant's rental-history share. Keyed by the
-- requesting org (after it's resolved) so it can't be side-stepped by varying the
-- email; 30/hour per org bounds enumeration/harassment while allowing bulk work.
create or replace function public.request_rental_history(p_tenant_email text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_org uuid; v_tenant uuid; v_id uuid; v_status text;
begin
  select org_id into v_org from public.org_members
    where user_id = auth.uid() order by created_at limit 1;
  if v_org is null then return jsonb_build_object('error', 'not_a_manager'); end if;
  if not public.rate_limit_touch('rental_history_req:' || v_org::text, 30, 3600) then
    return jsonb_build_object('error', 'rate_limited');
  end if;
  select user_id into v_tenant from public.tenant_portal_users
    where lower(email) = lower(btrim(p_tenant_email)) limit 1;
  if v_tenant is null then return jsonb_build_object('error', 'tenant_not_found'); end if;
  select id, status into v_id, v_status from public.rental_history_shares
    where tenant_user_id = v_tenant and requester_org_id = v_org;
  if v_id is not null then
    if v_status in ('declined','revoked') then
      update public.rental_history_shares
        set status = 'pending', requested_by = auth.uid(),
            tenant_email = btrim(p_tenant_email), created_at = now(), responded_at = null
        where id = v_id;
    end if;
    return jsonb_build_object('ok', true, 'share_id', v_id, 'status',
      (select status from public.rental_history_shares where id = v_id));
  end if;
  insert into public.rental_history_shares (tenant_user_id, requester_org_id, requested_by, tenant_email)
    values (v_tenant, v_org, auth.uid(), btrim(p_tenant_email))
    returning id into v_id;
  return jsonb_build_object('ok', true, 'share_id', v_id, 'status', 'pending');
end $function$;
