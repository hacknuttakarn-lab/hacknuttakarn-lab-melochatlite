-- Melo Chat Lite V55 — Admin Center: assign bundled Boost Add-ons to a user.
begin;

create or replace function public.admin_center_assign_boost_addon_v55(
  p_user_id uuid,
  p_addon_id uuid,
  p_reason text default 'Admin assignment'
) returns jsonb
language plpgsql security definer set search_path=public,auth as $$
declare
  v_addon public.boost_addons%rowtype;
  v_profile int;
  v_post int;
  v_profile_id uuid;
  v_post_id uuid;
  v_reason text:=coalesce(nullif(trim(p_reason),''),'Admin assignment');
begin
  if not public.is_admin_center_admin() then raise exception 'Admin access required'; end if;
  if p_user_id is null or p_addon_id is null then raise exception 'User and add-on are required'; end if;

  select * into v_addon from public.boost_addons where id=p_addon_id and is_active=true;
  if v_addon.id is null then raise exception 'Boost add-on not found'; end if;

  v_profile:=coalesce(v_addon.profile_boost_count,case when v_addon.boost_type='profile' then v_addon.boost_count else 0 end,0);
  v_post:=coalesce(v_addon.post_boost_count,case when v_addon.boost_type='post' then v_addon.boost_count else 0 end,0);
  if v_profile<=0 and v_post<=0 then raise exception 'Boost add-on has no credits'; end if;

  if v_profile>0 then
    insert into public.user_boost_addon_purchases(user_id,addon_id,boost_type,credit_total,expires_at)
    values(p_user_id,v_addon.id,'profile',v_profile,now()+make_interval(days=>coalesce(v_addon.credit_days,90)))
    returning id into v_profile_id;
  end if;
  if v_post>0 then
    insert into public.user_boost_addon_purchases(user_id,addon_id,boost_type,credit_total,expires_at)
    values(p_user_id,v_addon.id,'post',v_post,now()+make_interval(days=>coalesce(v_addon.credit_days,90)))
    returning id into v_post_id;
  end if;

  perform public.admin_center_write_audit('boost_addon_assigned',p_user_id,jsonb_build_object(
    'addon_id',v_addon.id,'addon_code',v_addon.code,'profile_credits',v_profile,'post_credits',v_post,
    'credit_days',coalesce(v_addon.credit_days,90),'reason',v_reason
  ));

  return jsonb_build_object('profile_purchase_id',v_profile_id,'post_purchase_id',v_post_id,'profile_credits',v_profile,'post_credits',v_post);
end $$;
revoke all on function public.admin_center_assign_boost_addon_v55(uuid,uuid,text) from public;
grant execute on function public.admin_center_assign_boost_addon_v55(uuid,uuid,text) to authenticated;

commit;
