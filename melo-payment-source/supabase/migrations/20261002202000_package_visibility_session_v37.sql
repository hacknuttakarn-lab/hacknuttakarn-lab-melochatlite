-- Melo Chat Lite V37
-- Separate "available in Admin Center" from "visible on the User Packages page".
-- The previous UI used one is_active flag for both jobs, so hiding a package from
-- users also made it disappear from Admin package management / assignment.
begin;

alter table public.subscription_plans
  add column if not exists show_on_user_packages boolean not null default true;

-- Preserve the intent of the old combined checkbox: rows that were previously
-- inactive are treated as hidden-from-user packages, then re-enabled internally
-- so Admin Center can still manage and assign them.
update public.subscription_plans
set show_on_user_packages = coalesce(is_active,true)
where show_on_user_packages is distinct from coalesce(is_active,true);

update public.subscription_plans
set is_active = true
where is_active = false;

-- Offer activity was also driven by the same combined checkbox. Keep all saved
-- offers available to Admin Center; user visibility is now controlled at plan level.
update public.subscription_plan_offers
set is_active = true,
    updated_at = now()
where is_active = false;

-- User-side reads only expose plans explicitly enabled for the User Packages page.
drop policy if exists plans_public_read on public.subscription_plans;
create policy plans_public_read on public.subscription_plans
for select to authenticated
using (
  public.is_admin_center_admin()
  or (is_active = true and show_on_user_packages = true)
);

drop policy if exists plan_offers_read on public.subscription_plan_offers;
create policy plan_offers_read on public.subscription_plan_offers
for select to authenticated
using (
  public.is_admin_center_admin()
  or (
    is_active = true
    and exists(
      select 1
      from public.subscription_plans p
      where p.id = plan_id
        and p.is_active = true
        and p.show_on_user_packages = true
    )
  )
);

-- Add user-page visibility to the existing Admin list RPC.
drop function if exists public.admin_center_list_plan_offers_v30();
create function public.admin_center_list_plan_offers_v30()
returns table(
  plan_id uuid,
  offer_id uuid,
  code text,
  name text,
  plan_sort_order int,
  duration_months int,
  regular_price numeric,
  promotion_enabled boolean,
  promotion_price numeric,
  promotion_label text,
  promotion_start timestamptz,
  promotion_end timestamptz,
  promotion_active boolean,
  effective_price numeric,
  is_active boolean,
  show_on_user_packages boolean,
  profile_post_limit int,
  translation_monthly_limit int,
  translation_quota int,
  profile_boost_monthly_limit int,
  post_boost_monthly_limit int,
  boosts_per_month int,
  can_view_profiles boolean,
  can_interested boolean,
  can_follow boolean,
  can_match boolean,
  can_chat boolean,
  can_comment boolean,
  can_save_post boolean,
  can_use_translation boolean,
  priority_support boolean,
  boost_priority int,
  high_post_limit boolean
)
language sql
security definer
set search_path=public
as $$
  select
    p.id,
    o.id,
    p.code,
    p.name,
    p.sort_order,
    o.duration_months,
    o.regular_price,
    o.promotion_enabled,
    o.promotion_price,
    o.promotion_label,
    o.promotion_start,
    o.promotion_end,
    (
      o.promotion_enabled=true
      and o.promotion_price is not null
      and (o.promotion_start is null or now()>=o.promotion_start)
      and (o.promotion_end is null or now()<o.promotion_end)
    ) as promotion_active,
    case
      when o.promotion_enabled=true
       and o.promotion_price is not null
       and (o.promotion_start is null or now()>=o.promotion_start)
       and (o.promotion_end is null or now()<o.promotion_end)
      then o.promotion_price
      else o.regular_price
    end as effective_price,
    (p.is_active and o.is_active) as is_active,
    p.show_on_user_packages,
    p.profile_post_limit,
    p.translation_monthly_limit,
    p.translation_quota,
    p.profile_boost_monthly_limit,
    p.post_boost_monthly_limit,
    p.boosts_per_month,
    p.can_view_profiles,
    p.can_interested,
    p.can_follow,
    p.can_match,
    p.can_chat,
    p.can_comment,
    p.can_save_post,
    p.can_use_translation,
    p.priority_support,
    p.boost_priority,
    p.high_post_limit
  from public.subscription_plans p
  join public.subscription_plan_offers o on o.plan_id=p.id
  where public.is_admin_center_admin()
  order by o.duration_months,p.sort_order,p.name;
$$;
revoke all on function public.admin_center_list_plan_offers_v30() from public;
grant execute on function public.admin_center_list_plan_offers_v30() to authenticated;

-- V37 save wrapper: packages/offers stay internally active. Visibility on the
-- User Packages page is a separate plan-level flag.
create or replace function public.admin_center_save_plan_offer_v37(
  p_plan_id uuid,
  p_offer_id uuid,
  p_code text,
  p_name text,
  p_duration_months int,
  p_price numeric,
  p_promotion_enabled boolean,
  p_promotion_price numeric,
  p_promotion_label text,
  p_promotion_start timestamptz,
  p_promotion_end timestamptz,
  p_profile_post_limit int,
  p_translation_limit int,
  p_profile_boost_limit int,
  p_post_boost_limit int,
  p_can_view_profiles boolean,
  p_can_interested boolean,
  p_can_follow boolean,
  p_can_match boolean,
  p_can_chat boolean,
  p_can_comment boolean,
  p_can_save_post boolean,
  p_can_use_translation boolean,
  p_priority_support boolean,
  p_boost_priority int,
  p_high_post_limit boolean,
  p_show_on_user_packages boolean
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_result jsonb;
  v_plan uuid;
  v_offer uuid;
begin
  if not public.is_admin_center_admin() then raise exception 'admin only'; end if;

  v_result := public.admin_center_save_plan_offer_v30(
    p_plan_id,
    p_offer_id,
    p_code,
    p_name,
    p_duration_months,
    p_price,
    p_promotion_enabled,
    p_promotion_price,
    p_promotion_label,
    p_promotion_start,
    p_promotion_end,
    p_profile_post_limit,
    p_translation_limit,
    p_profile_boost_limit,
    p_post_boost_limit,
    p_can_view_profiles,
    p_can_interested,
    p_can_follow,
    p_can_match,
    p_can_chat,
    p_can_comment,
    p_can_save_post,
    p_can_use_translation,
    p_priority_support,
    p_boost_priority,
    p_high_post_limit,
    true
  );

  v_plan := nullif(v_result->>'plan_id','')::uuid;
  v_offer := nullif(v_result->>'offer_id','')::uuid;

  update public.subscription_plans
  set is_active=true,
      show_on_user_packages=coalesce(p_show_on_user_packages,false),
      updated_at=now()
  where id=v_plan;

  update public.subscription_plan_offers
  set is_active=true,
      updated_at=now()
  where id=v_offer;

  return v_result || jsonb_build_object(
    'show_on_user_packages',coalesce(p_show_on_user_packages,false)
  );
end $$;
revoke all on function public.admin_center_save_plan_offer_v37(uuid,uuid,text,text,int,numeric,boolean,numeric,text,timestamptz,timestamptz,int,int,int,int,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,int,boolean,boolean) from public;
grant execute on function public.admin_center_save_plan_offer_v37(uuid,uuid,text,text,int,numeric,boolean,numeric,text,timestamptz,timestamptz,int,int,int,int,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,int,boolean,boolean) to authenticated;

create or replace function public.admin_center_set_plan_user_visibility_v37(
  p_plan_id uuid,
  p_visible boolean
) returns boolean
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.is_admin_center_admin() then raise exception 'admin only'; end if;

  update public.subscription_plans
  set show_on_user_packages=coalesce(p_visible,false),
      is_active=true,
      updated_at=now()
  where id=p_plan_id;

  if not found then raise exception 'package not found'; end if;

  perform public.admin_center_write_audit(
    'package_user_visibility_changed',
    null,
    jsonb_build_object('plan_id',p_plan_id,'visible',coalesce(p_visible,false))
  );
  return true;
end $$;
revoke all on function public.admin_center_set_plan_user_visibility_v37(uuid,boolean) from public;
grant execute on function public.admin_center_set_plan_user_visibility_v37(uuid,boolean) to authenticated;

commit;
notify pgrst,'reload schema';
