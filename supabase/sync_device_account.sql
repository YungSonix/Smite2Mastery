-- One-way device → cloud merge for accounts that accumulated local gold/builds before auth linking.
-- Run AFTER auth_session_hardening.sql + security_hardening_economy.sql

create or replace function public.sync_device_shop_state(
  p_local_gold integer,
  p_local_owned jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user text := public.resolve_economy_caller_username();
  v_gold integer;
  v_owned jsonb;
  v_merged jsonb;
  v_delta integer;
  v_new_gold integer;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  select gold, coalesce(shop_owned::jsonb, '[]'::jsonb)
  into v_gold, v_owned
  from public.user_data
  where username = v_user
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'user_not_found');
  end if;

  select coalesce(jsonb_agg(distinct elem), '[]'::jsonb)
  into v_merged
  from (
    select jsonb_array_elements_text(v_owned) as elem
    union
    select jsonb_array_elements_text(coalesce(p_local_owned, '[]'::jsonb))
  ) s;

  v_delta := greatest(0, coalesce(p_local_gold, 0) - coalesce(v_gold, 0));
  if v_delta > 0 then
    v_new_gold := public._apply_shop_gold_delta(v_user, v_delta, true);
  else
    v_new_gold := coalesce(v_gold, 0);
  end if;

  perform set_config('smite2.economy_rpc', '1', true);
  update public.user_data
  set shop_owned = v_merged::text, updated_at = now()
  where username = v_user;
  perform set_config('smite2.economy_rpc', '', true);

  return jsonb_build_object(
    'ok', true,
    'gold', v_new_gold,
    'shop_owned', v_merged,
    'gold_delta', v_delta
  );
end;
$$;

grant execute on function public.sync_device_shop_state(integer, jsonb) to authenticated;
