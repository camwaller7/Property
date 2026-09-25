-- Link an EXISTING signed-in account to a tenancy from its portal token.
-- The tenant sign-up link creates + links a brand-new account via the
-- handle_new_user trigger, but that never runs for an email that already has an
-- account. This RPC lets such a user (or a returning tenant with a prior
-- Corvelle account) sign in on the claim page and link their account to the
-- tenancy. Knowing the long random portal_token is the authorisation, same as
-- the token portal itself. Applied to tioeqxdulxqiptlszldp 2026-09-25.

create or replace function public.claim_tenancy(p_token text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_tenancy uuid;
  v_org uuid;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'not_authenticated');
  end if;
  select id, org_id into v_tenancy, v_org
    from public.tenancies where portal_token = p_token limit 1;
  if v_tenancy is null then
    return jsonb_build_object('error', 'invalid_token');
  end if;
  insert into public.tenant_portal_users (user_id, tenancy_id, org_id, email)
    values (v_uid, v_tenancy, v_org, (select email from auth.users where id = v_uid))
    on conflict (user_id) do update
      set tenancy_id = excluded.tenancy_id, org_id = excluded.org_id;
  return jsonb_build_object('ok', true);
end $function$;

revoke all on function public.claim_tenancy(text) from public;
grant execute on function public.claim_tenancy(text) to authenticated;
