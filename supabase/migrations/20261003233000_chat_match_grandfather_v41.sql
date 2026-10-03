-- Melo Chat Lite V41
-- Keep direct chat available for people who already matched before a paid package expires.
-- Other paid entitlements continue to use the normal package rules.
begin;

create or replace function public.melo_can_use_chat_v41()
returns boolean
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  v_uid uuid := auth.uid();
  v_ctx jsonb;
begin
  if v_uid is null then return false; end if;

  v_ctx := public.melo_plan_context_v25(v_uid);
  if coalesce((v_ctx->>'is_admin')::boolean,false) then return true; end if;
  if coalesce((v_ctx->>'can_chat')::boolean,false) then return true; end if;

  return exists(
    select 1
    from public.profile_matches m
    where m.user_a_id=v_uid or m.user_b_id=v_uid
  );
exception when others then
  return false;
end
$$;

revoke all on function public.melo_can_use_chat_v41() from public;
grant execute on function public.melo_can_use_chat_v41() to authenticated;

create or replace function public.melo_can_chat_with_user_v41(p_target_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  v_uid uuid := auth.uid();
  v_ctx jsonb;
begin
  if v_uid is null or p_target_user_id is null or p_target_user_id=v_uid then return false; end if;

  v_ctx := public.melo_plan_context_v25(v_uid);
  if coalesce((v_ctx->>'is_admin')::boolean,false) then return true; end if;
  if coalesce((v_ctx->>'can_chat')::boolean,false) then return true; end if;

  return exists(
    select 1
    from public.profile_matches m
    where (m.user_a_id=v_uid and m.user_b_id=p_target_user_id)
       or (m.user_b_id=v_uid and m.user_a_id=p_target_user_id)
  );
exception when others then
  return false;
end
$$;

revoke all on function public.melo_can_chat_with_user_v41(uuid) from public;
grant execute on function public.melo_can_chat_with_user_v41(uuid) to authenticated;

commit;
