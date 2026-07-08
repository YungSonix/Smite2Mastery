-- Auth session hardening — economy RPCs require auth.uid() linked to user_data
-- Run AFTER security_hardening_economy.sql
--
-- Supabase Dashboard: Authentication → Providers → Email → disable "Confirm email"
-- (or users cannot sign in immediately after register)

-- Must match lib/appAuth.js usernameToAuthEmail()
create or replace function public.username_to_auth_email(p_username text)
returns text
language sql
immutable
as $$
  select lower(regexp_replace(trim(coalesce(p_username, '')), '[^a-zA-Z0-9._-]', '_', 'g'))
         || '@users.smite2app.app';
$$;

-- Link auth.users.id → user_data.auth_user_id (caller must be signed in)
create or replace function public.link_auth_user_id(p_username text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_expected text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  if p_username is null or length(trim(p_username)) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'username_required');
  end if;

  v_expected := public.username_to_auth_email(p_username);
  select email into v_email from auth.users where id = v_uid limit 1;

  if v_email is null or lower(v_email) <> lower(v_expected) then
    return jsonb_build_object('ok', false, 'reason', 'email_mismatch');
  end if;

  update public.user_data
  set auth_user_id = v_uid, updated_at = now()
  where username = trim(p_username)
    and (auth_user_id is null or auth_user_id = v_uid);

  if not found then
    insert into public.user_data (username, auth_user_id, gold, total_gold_earned, shop_owned)
    values (trim(p_username), v_uid, 0, 0, '[]')
    on conflict (username) do update
      set auth_user_id = excluded.auth_user_id, updated_at = now()
    where public.user_data.auth_user_id is null
       or public.user_data.auth_user_id = excluded.auth_user_id;
  end if;

  return jsonb_build_object('ok', true, 'auth_user_id', v_uid);
end;
$$;

grant execute on function public.link_auth_user_id(text) to anon, authenticated;

-- Economy: auth.uid() only — ignores spoofable set_current_user
create or replace function public.resolve_economy_caller_username()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.username
  from public.user_data u
  where u.auth_user_id = auth.uid()
  limit 1;
$$;

-- Patch economy RPCs to require linked Supabase Auth session
create or replace function public.claim_daily_shop_gold()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user text := public.resolve_economy_caller_username();
  v_today date := (timezone('utc', now()))::date;
  v_amount integer := 50;
  v_new_gold integer;
  v_row public.shop_daily_claims%rowtype;
begin
  if v_user is null then
    raise exception 'not authenticated — sign in again to sync shop gold';
  end if;

  insert into public.shop_daily_claims (username, claim_day, gold_amount)
  values (v_user, v_today, v_amount)
  on conflict do nothing
  returning * into v_row;

  if v_row is null then
    return jsonb_build_object('claimed', false, 'reason', 'already_claimed');
  end if;

  v_new_gold := public._apply_shop_gold_delta(v_user, v_amount, true);
  perform public._record_shop_challenge_claim(v_user, 'daily_login', v_today);

  return jsonb_build_object('claimed', true, 'gold', v_amount, 'balance', v_new_gold);
end;
$$;

create or replace function public.claim_shop_challenge(p_condition text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user text := public.resolve_economy_caller_username();
  v_def public.shop_challenge_defs%rowtype;
  v_today date := (timezone('utc', now()))::date;
  v_new_gold integer;
  v_inserted boolean;
begin
  if v_user is null then
    raise exception 'not authenticated — sign in again to claim challenges';
  end if;

  select * into v_def from public.shop_challenge_defs where condition_key = p_condition;
  if not found then
    return jsonb_build_object('awarded', false, 'reason', 'unknown_challenge');
  end if;

  if v_def.repeatable then
    insert into public.shop_challenge_claims (username, condition_key, claim_day)
    values (v_user, p_condition, v_today)
    on conflict do nothing;
    v_inserted := found;
  else
    insert into public.shop_challenge_claims (username, condition_key, claim_day)
    values (v_user, p_condition, null)
    on conflict do nothing;
    v_inserted := found;
  end if;

  if not v_inserted then
    return jsonb_build_object('awarded', false, 'reason', 'already_claimed');
  end if;

  v_new_gold := public._apply_shop_gold_delta(v_user, v_def.gold_reward, true);

  return jsonb_build_object(
    'awarded', true,
    'gold', v_def.gold_reward,
    'balance', v_new_gold
  );
end;
$$;

create or replace function public.award_minigame_gold(p_amount integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user text := public.resolve_economy_caller_username();
  v_amount integer := greatest(0, least(coalesce(p_amount, 0), 200));
  v_new_gold integer;
begin
  if v_user is null then
    raise exception 'not authenticated — sign in again to earn gold';
  end if;
  if v_amount <= 0 then
    return jsonb_build_object('awarded', false, 'gold', 0);
  end if;

  v_new_gold := public._apply_shop_gold_delta(v_user, v_amount, true);
  return jsonb_build_object('awarded', true, 'gold', v_amount, 'balance', v_new_gold);
end;
$$;

create or replace function public.apply_prophecy_gold_delta(p_delta integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user text := public.resolve_economy_caller_username();
  v_delta integer;
  v_new_gold integer;
  v_earn boolean;
begin
  if v_user is null then
    raise exception 'not authenticated — sign in again for Smite Wars sync';
  end if;

  v_delta := greatest(-5000, least(coalesce(p_delta, 0), 5000));
  if v_delta = 0 then
    select gold into v_new_gold from public.user_data where username = v_user;
    return jsonb_build_object('ok', true, 'balance', coalesce(v_new_gold, 0));
  end if;

  v_earn := v_delta > 0;
  v_new_gold := public._apply_shop_gold_delta(v_user, v_delta, v_earn);

  return jsonb_build_object('ok', true, 'delta', v_delta, 'balance', v_new_gold);
end;
$$;

create or replace function public.purchase_shop_item(p_item_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user text := public.resolve_economy_caller_username();
  v_cost integer;
  v_gold integer;
  v_owned jsonb;
  v_owned_arr text[];
  v_new_gold integer;
begin
  if v_user is null then
    raise exception 'not authenticated — sign in again to purchase';
  end if;
  if p_item_id is null or length(trim(p_item_id)) = 0 then
    raise exception 'item_id required';
  end if;

  select gold_cost into v_cost from public.shop_item_catalog where item_id = p_item_id;
  if not found then
    return jsonb_build_object('purchased', false, 'reason', 'unknown_item');
  end if;

  select gold, coalesce(shop_owned::jsonb, '[]'::jsonb)
  into v_gold, v_owned
  from public.user_data
  where username = v_user
  for update;

  if not found then
    raise exception 'user not found';
  end if;

  select coalesce(array_agg(value), '{}')
  into v_owned_arr
  from jsonb_array_elements_text(v_owned);

  if p_item_id = any (v_owned_arr) then
    return jsonb_build_object('purchased', false, 'reason', 'already_owned');
  end if;

  if coalesce(v_gold, 0) < v_cost then
    return jsonb_build_object('purchased', false, 'reason', 'insufficient_gold');
  end if;

  v_new_gold := coalesce(v_gold, 0) - v_cost;
  v_owned := v_owned || jsonb_build_array(p_item_id);

  perform set_config('smite2.economy_rpc', '1', true);
  update public.user_data
  set gold = v_new_gold, shop_owned = v_owned::text, updated_at = now()
  where username = v_user;
  perform set_config('smite2.economy_rpc', '', true);

  return jsonb_build_object(
    'purchased', true,
    'item_id', p_item_id,
    'cost', v_cost,
    'balance', v_new_gold,
    'shop_owned', v_owned
  );
end;
$$;

-- Shop claim tables: read own rows via auth link only
drop policy if exists shop_challenge_claims_own_read on public.shop_challenge_claims;
create policy shop_challenge_claims_own_read on public.shop_challenge_claims
for select to authenticated
using (username = public.resolve_economy_caller_username());

drop policy if exists shop_daily_claims_own_read on public.shop_daily_claims;
create policy shop_daily_claims_own_read on public.shop_daily_claims
for select to authenticated
using (username = public.resolve_economy_caller_username());

-- set_current_user: deprecated — run auth_rls_hardening.sql to revoke client access
comment on function public.set_current_user(text) is
  'DEPRECATED. Use Supabase Auth (auth.uid()) via lib/appAuth.js. Revoked after auth_rls_hardening.sql.';
