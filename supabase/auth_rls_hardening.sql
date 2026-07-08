-- Auth RLS hardening — guides, builds, profile, prophecy decks (auth.uid() only)
-- Run AFTER auth_session_hardening.sql (step 5). Safe to re-run.
--
-- Replaces spoofable app.current_user / set_current_user for row ownership.
-- Clients must use Supabase Auth (lib/appAuth.js) before writes.

-- Required by auth_owns_username (also created in auth_session_hardening.sql)
-- Must match lib/appAuth.js usernameToAuthEmail()
create or replace function public.username_to_auth_email(p_username text)
returns text
language sql
immutable
as $$
  select lower(regexp_replace(trim(coalesce(p_username, '')), '[^a-zA-Z0-9._-]', '_', 'g'))
         || '@users.smite2app.app';
$$;

-- ---------------------------------------------------------------------------
-- Username resolution: linked Supabase Auth only
-- ---------------------------------------------------------------------------
create or replace function public.current_app_username()
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

create or replace function public.resolve_caller_username()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_username();
$$;

create or replace function public.auth_owns_username(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = auth.uid()
      and lower(u.email) = lower(public.username_to_auth_email(p_username))
  );
$$;

-- ---------------------------------------------------------------------------
-- user_data: auth session + email/username binding
-- ---------------------------------------------------------------------------
create or replace function public.trg_user_data_set_auth_user_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    if new.auth_user_id is null then
      new.auth_user_id := auth.uid();
    elsif new.auth_user_id <> auth.uid() then
      raise exception 'auth_user_id mismatch';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_user_data_set_auth_user_id on public.user_data;
create trigger trg_user_data_set_auth_user_id
before insert on public.user_data
for each row execute function public.trg_user_data_set_auth_user_id();

drop policy if exists "user_data_select_own" on public.user_data;
create policy "user_data_select_own" on public.user_data
for select to authenticated
using (auth.uid() = auth_user_id);

drop policy if exists "user_data_insert_own" on public.user_data;
create policy "user_data_insert_own" on public.user_data
for insert to authenticated
with check (
  auth.uid() = auth_user_id
  and public.auth_owns_username(username)
);

drop policy if exists "user_data_update_own" on public.user_data;
create policy "user_data_update_own" on public.user_data
for update to authenticated
using (auth.uid() = auth_user_id)
with check (
  auth.uid() = auth_user_id
  and public.auth_owns_username(username)
);

-- prophecy tables (user_id = app username)
drop policy if exists "user_cards_own_all" on public.user_cards;
create policy "user_cards_own_all" on public.user_cards
for all to authenticated
using (user_id = public.current_app_username())
with check (user_id = public.current_app_username());

drop policy if exists "decks_own_all" on public.decks;
create policy "decks_own_all" on public.decks
for all to authenticated
using (user_id = public.current_app_username())
with check (user_id = public.current_app_username());

drop policy if exists "pack_purchases_own_all" on public.pack_purchases;
create policy "pack_purchases_own_all" on public.pack_purchases
for all to authenticated
using (user_id = public.current_app_username())
with check (user_id = public.current_app_username());

-- ---------------------------------------------------------------------------
-- Guides / builds RPCs — verify auth.uid() matches request_username
-- ---------------------------------------------------------------------------
create or replace function public.update_community_guide(
  guide_id bigint,
  request_username text,
  payload jsonb
)
returns setof public.community_guides
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller text := public.current_app_username();
begin
  if v_caller is null or v_caller <> trim(request_username) then
    raise exception 'not authenticated — sign in again to edit guides';
  end if;

  return query
  update public.community_guides g
  set
    title = coalesce(nullif(payload ->> 'title', ''), g.title),
    subtitle = case when payload ? 'subtitle' then nullif(payload ->> 'subtitle', '') else g.subtitle end,
    body = coalesce(nullif(payload ->> 'body', ''), g.body),
    guide_type = coalesce(nullif(payload ->> 'guide_type', ''), g.guide_type),
    god_name = case when payload ? 'god_name' then nullif(payload ->> 'god_name', '') else g.god_name end,
    god_internal_name = case when payload ? 'god_internal_name' then nullif(payload ->> 'god_internal_name', '') else g.god_internal_name end,
    role_lane = case when payload ? 'role_lane' then nullif(payload ->> 'role_lane', '') else g.role_lane end,
    patch = case when payload ? 'patch' then nullif(payload ->> 'patch', '') else g.patch end,
    author_display_name = case
      when payload ? 'author_display_name' then nullif(payload ->> 'author_display_name', '')
      else g.author_display_name
    end,
    updated_at = now()
  where g.id = guide_id
    and g.username = trim(request_username)
  returning *;
end;
$$;

create or replace function public.update_contributor_build(
  build_id text,
  request_username text,
  payload jsonb
)
returns setof public.contributor_builds
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller text := public.current_app_username();
  v_id bigint;
begin
  if v_caller is null or v_caller <> trim(request_username) then
    raise exception 'not authenticated — sign in again to edit builds';
  end if;

  v_id := build_id::bigint;

  return query
  update public.contributor_builds b
  set
    build_name = coalesce(nullif(payload ->> 'build_name', ''), b.build_name),
    god_name = coalesce(nullif(payload ->> 'god_name', ''), b.god_name),
    god_internal_name = case when payload ? 'god_internal_name' then nullif(payload ->> 'god_internal_name', '') else b.god_internal_name end,
    items = case when payload ? 'items' then payload -> 'items' else b.items end,
    starting_items = case when payload ? 'starting_items' then payload -> 'starting_items' else b.starting_items end,
    relic = case when payload ? 'relic' then payload -> 'relic' else b.relic end,
    starting_relic = case when payload ? 'starting_relic' then payload -> 'starting_relic' else b.starting_relic end,
    final_relic = case when payload ? 'final_relic' then payload -> 'final_relic' else b.final_relic end,
    god_level = case when payload ? 'god_level' then (payload ->> 'god_level')::integer else b.god_level end,
    aspect_active = case when payload ? 'aspect_active' then (payload ->> 'aspect_active')::boolean else b.aspect_active end,
    notes = coalesce(nullif(payload ->> 'notes', ''), b.notes),
    tips = case when payload ? 'tips' then nullif(payload ->> 'tips', '') else b.tips end,
    ability_leveling_order = case when payload ? 'ability_leveling_order' then payload -> 'ability_leveling_order' else b.ability_leveling_order end,
    starting_ability_order = case when payload ? 'starting_ability_order' then payload -> 'starting_ability_order' else b.starting_ability_order end,
    item_swaps = case when payload ? 'item_swaps' then payload -> 'item_swaps' else b.item_swaps end,
    roles = case when payload ? 'roles' then payload -> 'roles' else b.roles end,
    gamemodes = case when payload ? 'gamemodes' then payload -> 'gamemodes' else b.gamemodes end,
    updated_at = coalesce((payload ->> 'updated_at')::timestamptz, now())
  where b.id = v_id
    and b.username = trim(request_username)
  returning *;
end;
$$;

grant execute on function public.update_contributor_build(text, text, jsonb) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Deprecate spoofable session RPC
-- ---------------------------------------------------------------------------
revoke execute on function public.set_current_user(text) from anon, authenticated;

comment on function public.set_current_user(text) is
  'DEPRECATED — revoked for clients. Use Supabase Auth (auth.uid()) via lib/appAuth.js.';

comment on function public.current_app_username() is
  'Resolves app username from auth.uid() → user_data.auth_user_id only.';
