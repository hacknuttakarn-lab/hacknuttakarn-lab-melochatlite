-- Melo Chat Lite V38
-- Soft-delete packages from the Admin/User catalog without revoking existing subscribers.
-- Existing active user_subscriptions keep using the plan until expiry/replacement.
begin;

alter table public.subscription_plans
  add column if not exists archived_at timestamptz;

create index if not exists subscription_plans_archived_at_idx
  on public.subscription_plans(archived_at);

-- Archived packages are never shown on the User Packages page.
update public.subscription_plans
set show_on_user_packages=false
where archived_at is not null and show_on_user_packages=true;

-- User-side reads must not expose archived catalog entries. Admins may still query
-- the row directly for historical support/audit purposes.
drop policy if exists plans_public_read on public.subscription_plans;
create policy plans_public_read on public.subscription_plans
for select to authenticated
using (
  public.is_admin_center_admin()
  or (
    is_active=true
    and show_on_user_packages=true
    and archived_at is null
  )
);

drop policy if exists plan_offers_read on public.subscription_plan_offers;
create policy plan_offers_read on public.subscription_plan_offers
for select to authenticated
using (
  public.is_admin_center_admin()
  or (
    is_active=true
    and exists(
      select 1
      from public.subscription_plans p
      where p.id=plan_id
        and p.is_active=true
        and p.show_on_user_packages=true
        and p.archived_at is null
    )
  )
);

-- Admin package catalog excludes archived packages. The package row remains in DB
-- so subscriptions, transaction history and audit history retain their references.
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
    and p.archived_at is null
  order by o.duration_months,p.sort_order,p.name;
$$;
revoke all on function public.admin_center_list_plan_offers_v30() from public;
grant execute on function public.admin_center_list_plan_offers_v30() to authenticated;

create or replace function public.admin_center_archive_plan_v38(p_plan_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  v_plan public.subscription_plans%rowtype;
begin
  if not public.is_admin_center_admin() then raise exception 'admin only'; end if;

  select * into v_plan
  from public.subscription_plans
  where id=p_plan_id
    and archived_at is null;

  if v_plan.id is null then raise exception 'package not found'; end if;
  if lower(coalesce(v_plan.code,''))='free' then raise exception 'Free package cannot be removed'; end if;

  update public.subscription_plans
  set archived_at=now(),
      show_on_user_packages=false,
      updated_at=now()
  where id=p_plan_id;

  perform public.admin_center_write_audit(
    'package_archived',
    null,
    jsonb_build_object(
      'plan_id',p_plan_id,
      'plan_code',v_plan.code,
      'plan_name',v_plan.name,
      'existing_subscriptions_preserved',true
    )
  );

  return true;
end $$;
revoke all on function public.admin_center_archive_plan_v38(uuid) from public;
grant execute on function public.admin_center_archive_plan_v38(uuid) to authenticated;

-- Prevent a stale browser from assigning an archived package to a new user.
create or replace function public.admin_center_assign_plan_v30(
  p_user_id uuid,
  p_plan_id uuid,
  p_offer_id uuid
) returns boolean
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_plan public.subscription_plans%rowtype;
  v_offer public.subscription_plan_offers%rowtype;
  v_months int;
  v_amount numeric;
  v_promo_active boolean;
begin
  if not public.is_admin_center_admin() then raise exception 'admin only'; end if;

  select * into v_plan
  from public.subscription_plans
  where id=p_plan_id
    and is_active=true
    and archived_at is null;
  if v_plan.id is null then raise exception 'package not found, inactive or removed'; end if;

  select * into v_offer
  from public.subscription_plan_offers
  where id=p_offer_id
    and plan_id=p_plan_id
    and is_active=true;
  if v_offer.id is null then raise exception 'package duration not found or inactive'; end if;

  v_promo_active:=v_offer.promotion_enabled=true and v_offer.promotion_price is not null
    and (v_offer.promotion_start is null or now()>=v_offer.promotion_start)
    and (v_offer.promotion_end is null or now()<v_offer.promotion_end);
  v_amount:=case when v_promo_active then v_offer.promotion_price else v_offer.regular_price end;
  v_months:=case when v_offer.duration_months=0 then 1 else v_offer.duration_months end;

  update public.user_subscriptions
  set status='replaced'
  where user_id=p_user_id and status='active';

  insert into public.user_subscriptions(user_id,plan_id,starts_at,billing_anchor,billing_period_months,expires_at,status)
  values(
    p_user_id,v_plan.id,now(),now(),v_months,
    case when v_offer.duration_months=0 then null else now()+make_interval(months=>v_months) end,
    'active'
  );

  insert into public.package_transactions(user_id,plan_id,transaction_type,amount,note)
  values(
    p_user_id,v_plan.id,'admin_package_change',v_amount,
    format('Assigned by admin: %s; duration %s month(s); charged %s THB%s',v_plan.name,v_offer.duration_months,v_amount,case when v_promo_active then '; promotion applied' else '' end)
  );

  perform public.admin_center_write_audit(
    'package_assigned',p_user_id,
    jsonb_build_object('plan_id',p_plan_id,'offer_id',p_offer_id,'duration_months',v_offer.duration_months,'amount',v_amount,'promotion_applied',v_promo_active)
  );
  return true;
end $$;
revoke all on function public.admin_center_assign_plan_v30(uuid,uuid,uuid) from public;
grant execute on function public.admin_center_assign_plan_v30(uuid,uuid,uuid) to authenticated;

commit;
notify pgrst,'reload schema';
