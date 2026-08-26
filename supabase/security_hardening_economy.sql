-- Security hardening: shop economy RPCs + protect user_data gold/shop_owned/gems
-- Run in Supabase SQL Editor AFTER prophecy_account_system.sql and supabase_shop_gold_leaderboard.sql
-- Then run: shop_item_catalog_seed.sql (or npm run shop:catalog:sql first)
--
-- OWASP alignment: Broken Access Control (M3), Insecure Data Storage (M9), Misconfiguration (M8)

-- ---------------------------------------------------------------------------
-- Session helper (custom username login — existing app pattern)
-- ---------------------------------------------------------------------------
create or replace function public.set_current_user(username_param text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if username_param is null or length(trim(username_param)) = 0 then
    return;
  end if;
  perform set_config('app.current_user', trim(username_param), true);
end;
$$;

grant execute on function public.set_current_user(text) to anon, authenticated;

create or replace function public.resolve_caller_username()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select u.username from public.user_data u where u.auth_user_id = auth.uid() limit 1),
    nullif(current_setting('app.current_user', true), '')
  );
$$;

-- ---------------------------------------------------------------------------
-- Block direct client writes to economy columns (service_role + RPCs only)
-- ---------------------------------------------------------------------------
create or replace function public.protect_user_data_economy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if coalesce(current_setting('smite2.economy_rpc', true), '') = '1' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.gold := coalesce(new.gold, 0);
    new.total_gold_earned := 0;
    new.gems := coalesce(new.gems, 0);
    if new.shop_owned is null then
      new.shop_owned := '[]';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    new.gold := old.gold;
    new.total_gold_earned := old.total_gold_earned;
    new.gems := old.gems;
    new.shop_owned := old.shop_owned;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_user_data_economy on public.user_data;
create trigger trg_protect_user_data_economy
before insert or update on public.user_data
for each row execute function public.protect_user_data_economy();

-- ---------------------------------------------------------------------------
-- Shop catalog + challenge definitions (server-side source of truth)
-- ---------------------------------------------------------------------------
create table if not exists public.shop_item_catalog (
  item_id text primary key,
  gold_cost integer not null check (gold_cost >= 0)
);

alter table public.shop_item_catalog enable row level security;
drop policy if exists shop_item_catalog_read on public.shop_item_catalog;
create policy shop_item_catalog_read on public.shop_item_catalog
for select to public using (true);

create table if not exists public.shop_challenge_defs (
  condition_key text primary key,
  gold_reward integer not null check (gold_reward > 0),
  repeatable boolean not null default true
);

insert into public.shop_challenge_defs (condition_key, gold_reward, repeatable) values
  ('daily_login', 50, true),
  ('wordle_win', 75, true),
  ('ability_win', 75, true),
  ('vgs_win', 75, true),
  ('save_build', 100, true),
  ('first_build', 150, false),
  ('profile_theme', 50, false),
  ('share_profile', 25, true)
on conflict (condition_key) do update set
  gold_reward = excluded.gold_reward,
  repeatable = excluded.repeatable;

create table if not exists public.shop_challenge_claims (
  id bigserial primary key,
  username text not null references public.user_data(username) on update cascade on delete cascade,
  condition_key text not null references public.shop_challenge_defs(condition_key),
  claim_day date,
  claimed_at timestamptz not null default now(),
  unique (username, condition_key, claim_day)
);

create unique index if not exists shop_challenge_claims_one_time_idx
  on public.shop_challenge_claims (username, condition_key)
  where claim_day is null;

alter table public.shop_challenge_claims enable row level security;
drop policy if exists shop_challenge_claims_own_read on public.shop_challenge_claims;
create policy shop_challenge_claims_own_read on public.shop_challenge_claims
for select to public using (username = public.resolve_caller_username());

create table if not exists public.shop_daily_claims (
  username text not null references public.user_data(username) on update cascade on delete cascade,
  claim_day date not null,
  gold_amount integer not null default 50,
  claimed_at timestamptz not null default now(),
  primary key (username, claim_day)
);

alter table public.shop_daily_claims enable row level security;
drop policy if exists shop_daily_claims_own_read on public.shop_daily_claims;
create policy shop_daily_claims_own_read on public.shop_daily_claims
for select to public using (username = public.resolve_caller_username());

-- ---------------------------------------------------------------------------
-- Internal: apply gold delta (SECURITY DEFINER — not granted to clients)
-- ---------------------------------------------------------------------------
create or replace function public._apply_shop_gold_delta(
  p_username text,
  p_delta integer,
  p_earn boolean default true
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_gold integer;
begin
  if p_username is null or length(trim(p_username)) = 0 then
    raise exception 'username required';
  end if;

  perform set_config('smite2.economy_rpc', '1', true);
  update public.user_data
  set
    gold = greatest(0, coalesce(gold, 0) + p_delta),
    total_gold_earned = case
      when p_earn and p_delta > 0 then coalesce(total_gold_earned, 0) + p_delta
      else coalesce(total_gold_earned, 0)
    end,
    updated_at = now()
  where username = p_username
  returning gold into v_new_gold;
  perform set_config('smite2.economy_rpc', '', true);

  if not found then
    raise exception 'user not found';
  end if;

  return v_new_gold;
end;
$$;

revoke all on function public._apply_shop_gold_delta(text, integer, boolean) from public;

-- ---------------------------------------------------------------------------
-- RPC: daily shop gold (50/day)
-- ---------------------------------------------------------------------------
create or replace function public._record_shop_challenge_claim(
  p_username text,
  p_condition text,
  p_day date default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_def public.shop_challenge_defs%rowtype;
begin
  select * into v_def from public.shop_challenge_defs where condition_key = p_condition;
  if not found then
    return false;
  end if;

  if v_def.repeatable then
    insert into public.shop_challenge_claims (username, condition_key, claim_day)
    values (p_username, p_condition, coalesce(p_day, (timezone('utc', now()))::date))
    on conflict do nothing;
    return found;
  end if;

  insert into public.shop_challenge_claims (username, condition_key, claim_day)
  values (p_username, p_condition, null)
  on conflict do nothing;
  return found;
end;
$$;

revoke all on function public._record_shop_challenge_claim(text, text, date) from public;

create or replace function public.claim_daily_shop_gold()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user text := public.resolve_caller_username();
  v_today date := (timezone('utc', now()))::date;
  v_amount integer := 50;
  v_new_gold integer;
  v_row public.shop_daily_claims%rowtype;
begin
  if v_user is null then
    raise exception 'not authenticated';
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

-- ---------------------------------------------------------------------------
-- RPC: challenge gold
-- ---------------------------------------------------------------------------
create or replace function public.claim_shop_challenge(p_condition text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user text := public.resolve_caller_username();
  v_def public.shop_challenge_defs%rowtype;
  v_today date := (timezone('utc', now()))::date;
  v_new_gold integer;
  v_inserted boolean;
begin
  if v_user is null then
    raise exception 'not authenticated';
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

-- ---------------------------------------------------------------------------
-- RPC: minigame bonus gold (capped)
-- ---------------------------------------------------------------------------
create or replace function public.award_minigame_gold(p_amount integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user text := public.resolve_caller_username();
  v_amount integer := greatest(0, least(coalesce(p_amount, 0), 200));
  v_new_gold integer;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  if v_amount <= 0 then
    return jsonb_build_object('awarded', false, 'gold', 0);
  end if;

  v_new_gold := public._apply_shop_gold_delta(v_user, v_amount, true);
  return jsonb_build_object('awarded', true, 'gold', v_amount, 'balance', v_new_gold);
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: prophecy / story gold adjustments
-- ---------------------------------------------------------------------------
create or replace function public.apply_prophecy_gold_delta(p_delta integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user text := public.resolve_caller_username();
  v_delta integer;
  v_new_gold integer;
  v_earn boolean;
begin
  if v_user is null then
    raise exception 'not authenticated';
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

-- ---------------------------------------------------------------------------
-- RPC: purchase shop item (server validates cost + ownership)
-- ---------------------------------------------------------------------------
create or replace function public.purchase_shop_item(p_item_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user text := public.resolve_caller_username();
  v_cost integer;
  v_gold integer;
  v_owned jsonb;
  v_owned_arr text[];
  v_new_gold integer;
begin
  if v_user is null then
    raise exception 'not authenticated';
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

grant execute on function public.claim_daily_shop_gold() to anon, authenticated;
grant execute on function public.claim_shop_challenge(text) to anon, authenticated;
grant execute on function public.award_minigame_gold(integer) to anon, authenticated;
grant execute on function public.apply_prophecy_gold_delta(integer) to anon, authenticated;
grant execute on function public.purchase_shop_item(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Discord bot drafts: remove public listing (token-only access)
-- ---------------------------------------------------------------------------
revoke execute on function public.list_discord_bot_shared_builds() from anon, authenticated;
