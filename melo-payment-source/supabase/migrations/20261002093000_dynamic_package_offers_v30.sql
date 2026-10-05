begin;

-- V30: separate package entitlements from purchasable duration/price offers.
-- Existing 1/3/6-month columns remain synced for backward compatibility with the current User Premium page.
create table if not exists public.subscription_plan_offers(
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.subscription_plans(id) on delete cascade,
  duration_months int not null default 1 check (duration_months >= 0),
  regular_price numeric(12,2) not null default 0 check (regular_price >= 0),
  promotion_enabled boolean not null default false,
  promotion_price numeric(12,2),
  promotion_label text,
  promotion_start timestamptz,
  promotion_end timestamptz,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(plan_id,duration_months),
  check (promotion_price is null or promotion_price >= 0),
  check (promotion_end is null or promotion_start is null or promotion_end > promotion_start)
);

create index if not exists subscription_plan_offers_plan_idx on public.subscription_plan_offers(plan_id,duration_months);

alter table public.subscription_plan_offers enable row level security;
drop policy if exists plan_offers_read on public.subscription_plan_offers;
create policy plan_offers_read on public.subscription_plan_offers
for select to authenticated
using (
  public.is_admin_center_admin()
  or (
    is_active = true
    and exists(select 1 from public.subscription_plans p where p.id=plan_id and p.is_active=true)
  )
);

-- Migrate the current Free/Premium/Premium+ prices to offer rows.
insert into public.subscription_plan_offers(plan_id,duration_months,regular_price,is_active,sort_order)
select p.id,0,0,p.is_active,0
from public.subscription_plans p
where p.code='free'
on conflict(plan_id,duration_months) do nothing;

insert into public.subscription_plan_offers(plan_id,duration_months,regular_price,is_active,sort_order)
select p.id,1,coalesce(p.price_1_month,p.price,0),p.is_active,10
from public.subscription_plans p
where p.code<>'free'
on conflict(plan_id,duration_months) do nothing;

insert into public.subscription_plan_offers(plan_id,duration_months,regular_price,is_active,sort_order)
select p.id,3,coalesce(p.price_3_months,0),p.is_active,30
from public.subscription_plans p
where p.code<>'free' and coalesce(p.price_3_months,0)>0
on conflict(plan_id,duration_months) do nothing;

insert into public.subscription_plan_offers(plan_id,duration_months,regular_price,is_active,sort_order)
select p.id,6,coalesce(p.price_6_months,0),p.is_active,60
from public.subscription_plans p
where p.code<>'free' and coalesce(p.price_6_months,0)>0
on conflict(plan_id,duration_months) do nothing;

create or replace function public.admin_center_list_plan_offers_v30()
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
    (p.is_active and o.is_active),
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

create or replace function public.admin_center_save_plan_offer_v30(
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
  p_active boolean
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_plan uuid:=p_plan_id;
  v_offer uuid:=p_offer_id;
  v_duration int:=greatest(0,coalesce(p_duration_months,1));
  v_price numeric:=case when coalesce(p_duration_months,1)=0 then 0 else greatest(0,coalesce(p_price,0)) end;
  v_sort int;
begin
  if not public.is_admin_center_admin() then raise exception 'admin only'; end if;
  if nullif(trim(coalesce(p_code,'')),'') is null then raise exception 'package code required'; end if;
  if nullif(trim(coalesce(p_name,'')),'') is null then raise exception 'package name required'; end if;
  if p_promotion_enabled and v_duration=0 then raise exception 'free package cannot use promotion'; end if;
  if p_promotion_enabled and coalesce(p_promotion_price,-1)<0 then raise exception 'promotion price required'; end if;
  if p_promotion_enabled and p_promotion_price>v_price then raise exception 'promotion price must not exceed regular price'; end if;
  if p_promotion_start is not null and p_promotion_end is not null and p_promotion_end<=p_promotion_start then raise exception 'promotion end must be after start'; end if;

  if v_plan is null then
    select coalesce(max(sort_order),0)+1 into v_sort from public.subscription_plans;
    insert into public.subscription_plans(
      code,name,price,price_1_month,price_3_months,price_6_months,duration_days,
      profile_post_limit,translation_monthly_limit,translation_quota,
      profile_boost_monthly_limit,post_boost_monthly_limit,boosts_per_month,
      can_view_profiles,can_interested,can_follow,can_match,can_chat,can_comment,can_save_post,
      can_use_translation,can_buy_translation_addon,priority_support,boost_priority,high_post_limit,
      is_active,sort_order
    ) values(
      lower(trim(p_code)),trim(p_name),case when v_duration=1 then v_price else 0 end,
      case when v_duration=1 then v_price else 0 end,
      case when v_duration=3 then v_price else 0 end,
      case when v_duration=6 then v_price else 0 end,
      case when v_duration=0 then 30 else greatest(30,v_duration*30) end,
      p_profile_post_limit,p_translation_limit,p_translation_limit,
      p_profile_boost_limit,p_post_boost_limit,p_profile_boost_limit,
      p_can_view_profiles,p_can_interested,p_can_follow,p_can_match,p_can_chat,p_can_comment,p_can_save_post,
      p_can_use_translation,p_can_use_translation,p_priority_support,p_boost_priority,p_high_post_limit,
      p_active,v_sort
    ) returning id into v_plan;
  else
    update public.subscription_plans set
      name=trim(p_name),
      profile_post_limit=p_profile_post_limit,
      translation_monthly_limit=p_translation_limit,
      translation_quota=p_translation_limit,
      profile_boost_monthly_limit=p_profile_boost_limit,
      post_boost_monthly_limit=p_post_boost_limit,
      boosts_per_month=p_profile_boost_limit,
      can_view_profiles=p_can_view_profiles,
      can_interested=p_can_interested,
      can_follow=p_can_follow,
      can_match=p_can_match,
      can_chat=p_can_chat,
      can_comment=p_can_comment,
      can_save_post=p_can_save_post,
      can_use_translation=p_can_use_translation,
      can_buy_translation_addon=p_can_use_translation,
      priority_support=p_priority_support,
      boost_priority=p_boost_priority,
      high_post_limit=p_high_post_limit,
      is_active=p_active,
      updated_at=now()
    where id=v_plan;
    if not found then raise exception 'package not found'; end if;
  end if;

  if v_offer is null then
    insert into public.subscription_plan_offers(
      plan_id,duration_months,regular_price,promotion_enabled,promotion_price,promotion_label,
      promotion_start,promotion_end,is_active,sort_order
    ) values(
      v_plan,v_duration,v_price,
      case when v_duration=0 then false else coalesce(p_promotion_enabled,false) end,
      case when v_duration=0 then null else p_promotion_price end,
      case when v_duration=0 then null else nullif(trim(coalesce(p_promotion_label,'')),'') end,
      case when v_duration=0 then null else p_promotion_start end,
      case when v_duration=0 then null else p_promotion_end end,
      p_active,v_duration*10
    )
    on conflict(plan_id,duration_months) do update set
      regular_price=excluded.regular_price,
      promotion_enabled=excluded.promotion_enabled,
      promotion_price=excluded.promotion_price,
      promotion_label=excluded.promotion_label,
      promotion_start=excluded.promotion_start,
      promotion_end=excluded.promotion_end,
      is_active=excluded.is_active,
      updated_at=now()
    returning id into v_offer;
  else
    update public.subscription_plan_offers set
      duration_months=v_duration,
      regular_price=v_price,
      promotion_enabled=case when v_duration=0 then false else coalesce(p_promotion_enabled,false) end,
      promotion_price=case when v_duration=0 then null else p_promotion_price end,
      promotion_label=case when v_duration=0 then null else nullif(trim(coalesce(p_promotion_label,'')),'') end,
      promotion_start=case when v_duration=0 then null else p_promotion_start end,
      promotion_end=case when v_duration=0 then null else p_promotion_end end,
      is_active=p_active,
      sort_order=v_duration*10,
      updated_at=now()
    where id=v_offer and plan_id=v_plan;
    if not found then raise exception 'package offer not found'; end if;
  end if;

  -- Keep V25 fields in sync so the current User Premium UI continues to work for 1/3/6 months.
  update public.subscription_plans p set
    price_1_month=coalesce((select o.regular_price from public.subscription_plan_offers o where o.plan_id=v_plan and o.duration_months=1 limit 1),0),
    price_3_months=coalesce((select o.regular_price from public.subscription_plan_offers o where o.plan_id=v_plan and o.duration_months=3 limit 1),0),
    price_6_months=coalesce((select o.regular_price from public.subscription_plan_offers o where o.plan_id=v_plan and o.duration_months=6 limit 1),0),
    price=coalesce((select o.regular_price from public.subscription_plan_offers o where o.plan_id=v_plan and o.duration_months=1 limit 1),(select o.regular_price from public.subscription_plan_offers o where o.plan_id=v_plan order by o.duration_months limit 1),0),
    updated_at=now()
  where p.id=v_plan;

  perform public.admin_center_write_audit('package_saved',null,jsonb_build_object('plan_id',v_plan,'offer_id',v_offer,'duration_months',v_duration,'price',v_price,'promotion_enabled',coalesce(p_promotion_enabled,false)));
  return jsonb_build_object('plan_id',v_plan,'offer_id',v_offer);
end $$;

revoke all on function public.admin_center_save_plan_offer_v30(uuid,uuid,text,text,int,numeric,boolean,numeric,text,timestamptz,timestamptz,int,int,int,int,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,int,boolean,boolean) from public;
grant execute on function public.admin_center_save_plan_offer_v30(uuid,uuid,text,text,int,numeric,boolean,numeric,text,timestamptz,timestamptz,int,int,int,int,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,int,boolean,boolean) to authenticated;

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
  select * into v_plan from public.subscription_plans where id=p_plan_id and is_active=true;
  if v_plan.id is null then raise exception 'package not found or inactive'; end if;
  select * into v_offer from public.subscription_plan_offers where id=p_offer_id and plan_id=p_plan_id and is_active=true;
  if v_offer.id is null then raise exception 'package duration not found or inactive'; end if;

  v_promo_active:=v_offer.promotion_enabled=true and v_offer.promotion_price is not null
    and (v_offer.promotion_start is null or now()>=v_offer.promotion_start)
    and (v_offer.promotion_end is null or now()<v_offer.promotion_end);
  v_amount:=case when v_promo_active then v_offer.promotion_price else v_offer.regular_price end;
  v_months:=case when v_offer.duration_months=0 then 1 else v_offer.duration_months end;

  update public.user_subscriptions set status='replaced' where user_id=p_user_id and status='active';
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

  perform public.admin_center_write_audit('package_assigned',p_user_id,jsonb_build_object('plan_id',p_plan_id,'offer_id',p_offer_id,'duration_months',v_offer.duration_months,'amount',v_amount,'promotion_applied',v_promo_active));
  return true;
end $$;
revoke all on function public.admin_center_assign_plan_v30(uuid,uuid,uuid) from public;
grant execute on function public.admin_center_assign_plan_v30(uuid,uuid,uuid) to authenticated;

commit;
notify pgrst,'reload schema';
