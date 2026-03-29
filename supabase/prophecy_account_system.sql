-- Smite Wars Prophecy account + RLS hardening
-- Uses existing public.user_data as the account record.
-- Run in Supabase SQL editor.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'prophecy_card_type') then
    create type public.prophecy_card_type as enum ('GOD', 'ITEM', 'TRAP', 'SPELL', 'LEADER');
  end if;
  if not exists (select 1 from pg_type where typname = 'prophecy_rarity') then
    create type public.prophecy_rarity as enum ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC');
  end if;
  if not exists (select 1 from pg_type where typname = 'prophecy_cost_type') then
    create type public.prophecy_cost_type as enum ('GOLD', 'GEMS');
  end if;
end $$;

-- user_data is the account source of truth for Smite Wars.
alter table if exists public.user_data add column if not exists auth_user_id uuid references auth.users(id) on delete set null;
alter table if exists public.user_data add column if not exists avatar_url text;
alter table if exists public.user_data add column if not exists is_dev boolean not null default false;
alter table if exists public.user_data add column if not exists gems integer not null default 0;
alter table if exists public.user_data add column if not exists level integer not null default 1;
alter table if exists public.user_data add column if not exists xp integer not null default 0;
alter table if exists public.user_data add column if not exists created_at timestamptz not null default now();
alter table if exists public.user_data alter column gold set default 500;
update public.user_data set gold = 500 where gold is null;
drop index if exists public.user_data_auth_user_id_key;
do $$
begin
  if exists (
    select auth_user_id
    from public.user_data
    where auth_user_id is not null
    group by auth_user_id
    having count(*) > 1
  ) then
    raise exception 'user_data.auth_user_id has duplicate values. Resolve duplicates before running this migration.';
  end if;
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_data_auth_user_id_unique'
      and conrelid = 'public.user_data'::regclass
  ) then
    alter table public.user_data
      add constraint user_data_auth_user_id_unique unique (auth_user_id);
  end if;
end
$$;

create table if not exists public.user_cards (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.user_data(username) on update cascade on delete cascade,
  card_id text not null,
  card_type public.prophecy_card_type not null,
  rarity public.prophecy_rarity not null,
  rank integer not null default 1 check (rank between 1 and 5),
  is_foil boolean not null default false,
  acquired_at timestamptz not null default now(),
  source text not null default 'pack_purchase'
);

create table if not exists public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.user_data(username) on update cascade on delete cascade,
  name text not null check (char_length(name) <= 20),
  leader_id text not null,
  card_ids jsonb not null default '[]'::jsonb,
  avg_cost numeric(6,2) not null default 0,
  is_valid boolean not null default false,
  wins integer not null default 0,
  losses integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pack_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.user_data(username) on update cascade on delete cascade,
  pack_type text not null,
  cost_type public.prophecy_cost_type not null,
  cost_amount integer not null check (cost_amount >= 0),
  cards_received jsonb not null default '[]'::jsonb,
  purchased_at timestamptz not null default now()
);

-- Seed this from local card data once.
create table if not exists public.prophecy_card_catalog (
  card_id text primary key,
  card_type public.prophecy_card_type not null,
  rarity public.prophecy_rarity not null,
  item_tier integer check (item_tier between 1 and 3)
);

do $$
declare
  c record;
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'user_data_username_unique'
      and conrelid = 'public.user_data'::regclass
  ) then
    alter table public.user_data
      add constraint user_data_username_unique unique (username);
  end if;

  if to_regclass('public.user_cards') is not null then
    for c in
      select policyname as conname
      from pg_policies
      where schemaname = 'public' and tablename = 'user_cards'
    loop
      execute format('drop policy if exists %I on public.user_cards', c.conname);
    end loop;
    for c in
      select conname
      from pg_constraint
      where conrelid = 'public.user_cards'::regclass
        and contype = 'f'
        and conname like '%user_id%'
    loop
      execute format('alter table public.user_cards drop constraint %I', c.conname);
    end loop;
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'user_cards' and column_name = 'user_id' and data_type <> 'text'
    ) then
      alter table public.user_cards alter column user_id type text using user_id::text;
    end if;
    if not exists (
      select 1 from pg_constraint
      where conname = 'user_cards_user_id_username_fkey'
        and conrelid = 'public.user_cards'::regclass
    ) then
      alter table public.user_cards
        add constraint user_cards_user_id_username_fkey
        foreign key (user_id) references public.user_data(username) on update cascade on delete cascade;
    end if;
  end if;

  if to_regclass('public.decks') is not null then
    for c in
      select policyname as conname
      from pg_policies
      where schemaname = 'public' and tablename = 'decks'
    loop
      execute format('drop policy if exists %I on public.decks', c.conname);
    end loop;
    for c in
      select conname
      from pg_constraint
      where conrelid = 'public.decks'::regclass
        and contype = 'f'
        and conname like '%user_id%'
    loop
      execute format('alter table public.decks drop constraint %I', c.conname);
    end loop;
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'decks' and column_name = 'user_id' and data_type <> 'text'
    ) then
      alter table public.decks alter column user_id type text using user_id::text;
    end if;
    if not exists (
      select 1 from pg_constraint
      where conname = 'decks_user_id_username_fkey'
        and conrelid = 'public.decks'::regclass
    ) then
      alter table public.decks
        add constraint decks_user_id_username_fkey
        foreign key (user_id) references public.user_data(username) on update cascade on delete cascade;
    end if;
  end if;

  if to_regclass('public.pack_purchases') is not null then
    for c in
      select policyname as conname
      from pg_policies
      where schemaname = 'public' and tablename = 'pack_purchases'
    loop
      execute format('drop policy if exists %I on public.pack_purchases', c.conname);
    end loop;
    for c in
      select conname
      from pg_constraint
      where conrelid = 'public.pack_purchases'::regclass
        and contype = 'f'
        and conname like '%user_id%'
    loop
      execute format('alter table public.pack_purchases drop constraint %I', c.conname);
    end loop;
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'pack_purchases' and column_name = 'user_id' and data_type <> 'text'
    ) then
      alter table public.pack_purchases alter column user_id type text using user_id::text;
    end if;
    if not exists (
      select 1 from pg_constraint
      where conname = 'pack_purchases_user_id_username_fkey'
        and conrelid = 'public.pack_purchases'::regclass
    ) then
      alter table public.pack_purchases
        add constraint pack_purchases_user_id_username_fkey
        foreign key (user_id) references public.user_data(username) on update cascade on delete cascade;
    end if;
  end if;
end
$$;

create index if not exists idx_user_cards_user_id on public.user_cards(user_id);
create index if not exists idx_user_cards_user_card on public.user_cards(user_id, card_id);
create index if not exists idx_decks_user_id on public.decks(user_id);
create index if not exists idx_pack_purchases_user_id on public.pack_purchases(user_id);

alter table public.user_data enable row level security;
alter table public.user_cards enable row level security;
alter table public.decks enable row level security;
alter table public.pack_purchases enable row level security;
alter table public.prophecy_card_catalog enable row level security;

create or replace function public.current_app_username()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    nullif(current_setting('app.current_user', true), ''),
    (select username from public.user_data where auth_user_id = auth.uid() limit 1)
  )
$$;

drop policy if exists "user_data_select_own" on public.user_data;
create policy "user_data_select_own" on public.user_data
for select to public using (username = public.current_app_username() or auth.uid() = auth_user_id);

drop policy if exists "user_data_insert_own" on public.user_data;
create policy "user_data_insert_own" on public.user_data
for insert to public with check (username = public.current_app_username() or auth.uid() = auth_user_id);

drop policy if exists "user_data_update_own" on public.user_data;
create policy "user_data_update_own" on public.user_data
for update to public using (username = public.current_app_username() or auth.uid() = auth_user_id) with check (username = public.current_app_username() or auth.uid() = auth_user_id);

drop policy if exists "user_cards_own_all" on public.user_cards;
create policy "user_cards_own_all" on public.user_cards
for all to public
using (user_id = public.current_app_username())
with check (user_id = public.current_app_username());

drop policy if exists "decks_own_all" on public.decks;
create policy "decks_own_all" on public.decks
for all to public
using (user_id = public.current_app_username())
with check (user_id = public.current_app_username());

drop policy if exists "pack_purchases_own_all" on public.pack_purchases;
create policy "pack_purchases_own_all" on public.pack_purchases
for all to public
using (user_id = public.current_app_username())
with check (user_id = public.current_app_username());

drop policy if exists "prophecy_card_catalog_read" on public.prophecy_card_catalog;
create policy "prophecy_card_catalog_read" on public.prophecy_card_catalog
for select to public using (true);

-- never allow client to toggle user_data.is_dev
create or replace function public.protect_user_data_is_dev()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    if tg_op = 'insert' then
      new.is_dev := false;
    elsif tg_op = 'update' then
      new.is_dev := old.is_dev;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_user_data_is_dev on public.user_data;
create trigger trg_protect_user_data_is_dev
before insert or update on public.user_data
for each row execute function public.protect_user_data_is_dev();

create or replace function public.touch_decks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_decks_updated_at on public.decks;
create trigger trg_touch_decks_updated_at
before update on public.decks
for each row execute function public.touch_decks_updated_at();

-- 40-card starter pack grant, idempotent.
create or replace function public.grant_starter_pack(p_user_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  picked_card_id text;
  picked_rarity public.prophecy_rarity;
  needed_traps integer;
  i integer;
  roll float8;
begin
  if p_user_id is null or btrim(p_user_id) = '' then
    return;
  end if;

  if exists (select 1 from public.user_cards where user_id = p_user_id) then
    return;
  end if;

  for picked_rarity in
    select unnest(array[
      'COMMON'::public.prophecy_rarity,
      'UNCOMMON'::public.prophecy_rarity,
      'RARE'::public.prophecy_rarity,
      'EPIC'::public.prophecy_rarity,
      'LEGENDARY'::public.prophecy_rarity
    ])
  loop
    select card_id into picked_card_id
    from public.prophecy_card_catalog
    where card_type = 'GOD' and rarity = picked_rarity
    order by random()
    limit 1;
    if picked_card_id is not null then
      insert into public.user_cards (user_id, card_id, card_type, rarity, rank, is_foil, source)
      values (p_user_id, picked_card_id, 'GOD', picked_rarity, 1, false, 'starter_pack');
    end if;
  end loop;

  for i in 1..15 loop
    roll := random();
    picked_rarity := case
      when roll < 0.60 then 'COMMON'::public.prophecy_rarity
      when roll < 0.85 then 'UNCOMMON'::public.prophecy_rarity
      when roll < 0.95 then 'RARE'::public.prophecy_rarity
      when roll < 0.99 then 'EPIC'::public.prophecy_rarity
      else 'LEGENDARY'::public.prophecy_rarity
    end;
    select card_id into picked_card_id
    from public.prophecy_card_catalog c
    where c.card_type = 'GOD'
      and c.rarity = picked_rarity
      and (
        picked_rarity <> 'LEGENDARY'
        or not exists (
          select 1 from public.user_cards uc
          where uc.user_id = p_user_id and uc.source = 'starter_pack' and uc.card_type = 'GOD' and uc.rarity = 'LEGENDARY' and uc.card_id = c.card_id
        )
      )
    order by random()
    limit 1;
    if picked_card_id is not null then
      insert into public.user_cards (user_id, card_id, card_type, rarity, rank, is_foil, source)
      values (p_user_id, picked_card_id, 'GOD', picked_rarity, 1, false, 'starter_pack');
    end if;
  end loop;

  for i in 1..3 loop
    select card_id into picked_card_id
    from public.prophecy_card_catalog
    where card_type = 'ITEM' and item_tier = i
    order by random()
    limit 1;
    if picked_card_id is not null then
      insert into public.user_cards (user_id, card_id, card_type, rarity, rank, is_foil, source)
      select p_user_id, card_id, 'ITEM', rarity, 1, false, 'starter_pack'
      from public.prophecy_card_catalog
      where card_id = picked_card_id;
    end if;
  end loop;

  for i in 1..7 loop
    roll := random();
    select card_id into picked_card_id
    from public.prophecy_card_catalog
    where card_type = 'ITEM'
      and item_tier = case when roll < 0.55 then 1 when roll < 0.90 then 2 else 3 end
    order by random()
    limit 1;
    if picked_card_id is not null then
      insert into public.user_cards (user_id, card_id, card_type, rarity, rank, is_foil, source)
      select p_user_id, card_id, 'ITEM', rarity, 1, false, 'starter_pack'
      from public.prophecy_card_catalog
      where card_id = picked_card_id;
    end if;
  end loop;

  for picked_rarity in
    select distinct rarity from public.prophecy_card_catalog where card_type = 'TRAP' order by rarity
  loop
    select card_id into picked_card_id
    from public.prophecy_card_catalog
    where card_type = 'TRAP' and rarity = picked_rarity
    order by random()
    limit 1;
    if picked_card_id is not null then
      insert into public.user_cards (user_id, card_id, card_type, rarity, rank, is_foil, source)
      values (p_user_id, picked_card_id, 'TRAP', picked_rarity, 1, false, 'starter_pack');
    end if;
  end loop;

  select greatest(0, 10 - count(*))
  into needed_traps
  from public.user_cards
  where user_id = p_user_id and source = 'starter_pack' and card_type = 'TRAP';

  for i in 1..needed_traps loop
    roll := random();
    picked_rarity := case
      when roll < 0.60 then 'COMMON'::public.prophecy_rarity
      when roll < 0.85 then 'UNCOMMON'::public.prophecy_rarity
      when roll < 0.95 then 'RARE'::public.prophecy_rarity
      when roll < 0.99 then 'EPIC'::public.prophecy_rarity
      else 'LEGENDARY'::public.prophecy_rarity
    end;
    select card_id into picked_card_id
    from public.prophecy_card_catalog
    where card_type = 'TRAP' and rarity = picked_rarity
    order by random()
    limit 1;
    if picked_card_id is not null then
      insert into public.user_cards (user_id, card_id, card_type, rarity, rank, is_foil, source)
      values (p_user_id, picked_card_id, 'TRAP', picked_rarity, 1, false, 'starter_pack');
    end if;
  end loop;
end;
$$;

-- Starter pack auto-grant when a user_data account row is created for an auth user.
create or replace function public.trg_user_data_grant_starter_pack()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.username is not null and btrim(new.username) <> '' then
    perform public.grant_starter_pack(new.username);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_user_data_grant_starter_pack on public.user_data;
create trigger trg_user_data_grant_starter_pack
after insert on public.user_data
for each row execute function public.trg_user_data_grant_starter_pack();

-- ------------------------------
-- Existing app tables RLS hardening
-- ------------------------------
-- These are conditional so they won't fail if a table is missing.
-- Access is scoped to the current app username context.

do $$
begin
  if to_regclass('public.app_users') is not null
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'app_users' and column_name = 'username') then
    execute 'alter table public.app_users enable row level security';
    execute 'drop policy if exists app_users_self_read on public.app_users';
    execute 'create policy app_users_self_read on public.app_users for select to public using (username = public.current_app_username())';
    execute 'drop policy if exists app_users_self_write on public.app_users';
    execute 'create policy app_users_self_write on public.app_users for all to public using (username = public.current_app_username()) with check (username = public.current_app_username())';
  end if;

  if to_regclass('public.community_builds') is not null
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'community_builds' and column_name = 'username') then
    execute 'alter table public.community_builds enable row level security';
    execute 'drop policy if exists community_builds_read_all on public.community_builds';
    execute 'create policy community_builds_read_all on public.community_builds for select to public using (true)';
    execute 'drop policy if exists community_builds_owner_write on public.community_builds';
    execute 'create policy community_builds_owner_write on public.community_builds for all to public using (username = public.current_app_username()) with check (username = public.current_app_username())';
  end if;

  if to_regclass('public.contributor_builds') is not null
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'contributor_builds' and column_name = 'username') then
    execute 'alter table public.contributor_builds enable row level security';
    execute 'drop policy if exists contributor_builds_read_all on public.contributor_builds';
    execute 'create policy contributor_builds_read_all on public.contributor_builds for select to public using (true)';
    execute 'drop policy if exists contributor_builds_owner_write on public.contributor_builds';
    execute 'create policy contributor_builds_owner_write on public.contributor_builds for all to public using (username = public.current_app_username()) with check (username = public.current_app_username())';
  end if;

  if to_regclass('public.community_guides') is not null
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'community_guides' and column_name = 'username') then
    execute 'alter table public.community_guides enable row level security';
    execute 'drop policy if exists community_guides_read_all on public.community_guides';
    execute 'create policy community_guides_read_all on public.community_guides for select to public using (true)';
    execute 'drop policy if exists community_guides_owner_write on public.community_guides';
    execute 'create policy community_guides_owner_write on public.community_guides for all to public using (username = public.current_app_username()) with check (username = public.current_app_username())';
  end if;

  if to_regclass('public.certification_requests') is not null
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'certification_requests' and column_name = 'username') then
    execute 'alter table public.certification_requests enable row level security';
    execute 'drop policy if exists certification_requests_self_read on public.certification_requests';
    execute 'create policy certification_requests_self_read on public.certification_requests for select to public using (username = public.current_app_username())';
    execute 'drop policy if exists certification_requests_self_write on public.certification_requests';
    execute 'create policy certification_requests_self_write on public.certification_requests for all to public using (username = public.current_app_username()) with check (username = public.current_app_username())';
  end if;

  if to_regclass('public.ability_scores') is not null
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ability_scores' and column_name = 'username') then
    execute 'alter table public.ability_scores enable row level security';
    execute 'drop policy if exists ability_scores_read_all on public.ability_scores';
    execute 'create policy ability_scores_read_all on public.ability_scores for select to public using (true)';
    execute 'drop policy if exists ability_scores_self_write on public.ability_scores';
    execute 'create policy ability_scores_self_write on public.ability_scores for all to public using (username = public.current_app_username()) with check (username = public.current_app_username())';
  end if;

  if to_regclass('public.wordle_scores') is not null
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'wordle_scores' and column_name = 'username') then
    execute 'alter table public.wordle_scores enable row level security';
    execute 'drop policy if exists wordle_scores_read_all on public.wordle_scores';
    execute 'create policy wordle_scores_read_all on public.wordle_scores for select to public using (true)';
    execute 'drop policy if exists wordle_scores_self_write on public.wordle_scores';
    execute 'create policy wordle_scores_self_write on public.wordle_scores for all to public using (username = public.current_app_username()) with check (username = public.current_app_username())';
  end if;
end
$$;
