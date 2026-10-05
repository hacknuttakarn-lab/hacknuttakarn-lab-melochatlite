-- Melo Chat Lite - guarded admin deletion
-- Admin deletion remains reversible for 90 days, but now requires an exact member-code confirmation
-- and a reason which is retained in the audit log.
create or replace function public.admin_center_schedule_user_deletion(
  p_user_id uuid,
  p_confirmation text,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_member_code text;
  v_reason text := btrim(coalesce(p_reason,''));
begin
  if not public.admin_center_has_permission('users_delete') then
    raise exception 'users_delete permission required';
  end if;

  if p_user_id=auth.uid() then
    raise exception 'cannot apply this action to your own admin account';
  end if;

  if exists(select 1 from public.admin_users where user_id=p_user_id and role='super_admin')
     and not exists(select 1 from public.admin_users where user_id=auth.uid() and role='super_admin' and is_active=true) then
    raise exception 'Only Super Admin can delete Super Admin';
  end if;

  select 'ME'||lpad(m.member_number::text,6,'0')
    into v_member_code
  from public.member_registry m
  where m.user_id=p_user_id
  limit 1;

  if v_member_code is null then
    raise exception 'member code not found';
  end if;

  if btrim(coalesce(p_confirmation,'')) <> ('DELETE '||v_member_code) then
    raise exception 'confirmation text does not match';
  end if;

  if char_length(v_reason) < 3 then
    raise exception 'deletion reason is required';
  end if;

  insert into public.user_deletion_requests(user_id,requested_at,delete_after,requested_by,cancelled_at,cancelled_by)
  values(p_user_id,now(),now()+interval '90 days',auth.uid(),null,null)
  on conflict(user_id) do update
    set requested_at=now(),
        delete_after=now()+interval '90 days',
        requested_by=auth.uid(),
        cancelled_at=null,
        cancelled_by=null;

  perform public.admin_center_write_audit(
    'user_delete_scheduled',
    p_user_id,
    jsonb_build_object(
      'reason',v_reason,
      'delete_after',now()+interval '90 days',
      'waiting_days',90,
      'confirmation',v_member_code
    )
  );
  return true;
end $$;

revoke all on function public.admin_center_schedule_user_deletion(uuid,text,text) from public,anon;
grant execute on function public.admin_center_schedule_user_deletion(uuid,text,text) to authenticated;
