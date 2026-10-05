-- Melo Chat Lite V40 — Stripe Translation Add-on fulfillment.
-- Adds paid translation quota only after a verified Stripe webhook.
begin;

create table if not exists public.stripe_translation_addon_fulfillments (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  stripe_session_id text not null unique,
  stripe_environment text not null check (stripe_environment in ('sandbox','live')),
  user_id uuid not null references auth.users(id) on delete cascade,
  addon_id uuid not null references public.translation_addons(id),
  amount numeric(12,2) not null default 0,
  currency text not null default 'THB',
  fulfilled_at timestamptz not null default now()
);

create index if not exists stripe_translation_addon_fulfillments_user_idx
  on public.stripe_translation_addon_fulfillments(user_id, fulfilled_at desc);

alter table public.stripe_translation_addon_fulfillments enable row level security;
-- Intentionally no browser RLS policy: server/service-role only.

create or replace function public.melo_fulfill_stripe_translation_addon_v40(
  p_event_id text,
  p_session_id text,
  p_environment text,
  p_user_id uuid,
  p_addon_id uuid,
  p_amount numeric,
  p_currency text default 'THB'
) returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_addon public.translation_addons%rowtype;
  v_sub public.user_subscriptions%rowtype;
  v_plan public.subscription_plans%rowtype;
  v_anchor timestamptz;
  v_cycle_start timestamptz;
  v_cycle_end timestamptz;
  v_months int;
  v_fulfillment_id uuid;
  v_transaction_id uuid;
  v_user_addon_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required';
  end if;

  if nullif(trim(coalesce(p_event_id,'')),'') is null
     or nullif(trim(coalesce(p_session_id,'')),'') is null then
    raise exception 'stripe event/session id required';
  end if;
  if p_environment not in ('sandbox','live') then raise exception 'invalid stripe environment'; end if;
  if p_user_id is null or p_addon_id is null then raise exception 'missing checkout metadata'; end if;

  select * into v_addon from public.translation_addons where id=p_addon_id and is_active=true;
  if v_addon.id is null then raise exception 'translation add-on not found or inactive'; end if;

  select * into v_sub
  from public.user_subscriptions
  where user_id=p_user_id and status='active' and (expires_at is null or expires_at>now())
  order by starts_at desc limit 1;
  if v_sub.id is null then raise exception 'active paid subscription required'; end if;

  select * into v_plan from public.subscription_plans where id=v_sub.plan_id and is_active=true;
  if v_plan.id is null then raise exception 'active package not found'; end if;
  if not (v_plan.code = any(v_addon.eligible_plans)) or not coalesce(v_plan.can_buy_translation_addon,false) then
    raise exception 'translation add-on is not eligible for current package';
  end if;

  v_anchor := coalesce(v_sub.billing_anchor,v_sub.starts_at,now());
  v_months := greatest(0,(date_part('year',age(now(),v_anchor))::int*12)+date_part('month',age(now(),v_anchor))::int);
  v_cycle_start := v_anchor + make_interval(months=>v_months);
  if v_cycle_start > now() then v_cycle_start := v_cycle_start - interval '1 month'; end if;
  v_cycle_end := least(v_cycle_start + interval '1 month', coalesce(v_sub.expires_at, v_cycle_start + interval '1 month'));
  if v_cycle_end <= now() then raise exception 'current billing cycle has ended'; end if;

  insert into public.stripe_translation_addon_fulfillments(
    stripe_event_id,stripe_session_id,stripe_environment,user_id,addon_id,amount,currency
  ) values (
    trim(p_event_id),trim(p_session_id),p_environment,p_user_id,p_addon_id,
    greatest(0,coalesce(p_amount,0)),upper(coalesce(nullif(trim(p_currency),''),'THB'))
  )
  on conflict do nothing
  returning id into v_fulfillment_id;

  if v_fulfillment_id is null then
    return jsonb_build_object('fulfilled',false,'duplicate',true,'session_id',p_session_id);
  end if;

  insert into public.package_transactions(user_id,plan_id,transaction_type,amount,currency,note)
  values (
    p_user_id,v_plan.id,'stripe_translation_addon',greatest(0,coalesce(p_amount,0)),
    upper(coalesce(nullif(trim(p_currency),''),'THB')),
    format('Stripe Translation Add-on %s; addon %s; environment %s',p_session_id,p_addon_id,p_environment)
  ) returning id into v_transaction_id;

  insert into public.user_translation_addons(
    user_id,addon_id,cycle_start,cycle_end,character_limit,character_used,status,transaction_id
  ) values (
    p_user_id,p_addon_id,v_cycle_start,v_cycle_end,v_addon.translation_characters,0,'active',v_transaction_id
  ) returning id into v_user_addon_id;

  return jsonb_build_object(
    'fulfilled',true,
    'duplicate',false,
    'user_translation_addon_id',v_user_addon_id,
    'addon_id',p_addon_id,
    'translation_characters',v_addon.translation_characters,
    'cycle_start',v_cycle_start,
    'cycle_end',v_cycle_end
  );
end $$;

revoke all on function public.melo_fulfill_stripe_translation_addon_v40(text,text,text,uuid,uuid,numeric,text) from public;
grant execute on function public.melo_fulfill_stripe_translation_addon_v40(text,text,text,uuid,uuid,numeric,text) to service_role;

commit;
notify pgrst,'reload schema';
