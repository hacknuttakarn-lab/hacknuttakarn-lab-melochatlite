-- Melo Chat Lite V39 — Stripe Checkout fulfillment.
-- Activates a paid package only from a verified server-side Stripe webhook.
begin;

create table if not exists public.stripe_checkout_fulfillments (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  stripe_session_id text not null unique,
  stripe_environment text not null check (stripe_environment in ('sandbox','live')),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  offer_id uuid not null references public.subscription_plan_offers(id),
  duration_months int not null check (duration_months > 0),
  amount numeric(12,2) not null default 0,
  currency text not null default 'THB',
  fulfilled_at timestamptz not null default now()
);

create index if not exists stripe_checkout_fulfillments_user_idx
  on public.stripe_checkout_fulfillments(user_id, fulfilled_at desc);

alter table public.stripe_checkout_fulfillments enable row level security;

-- No browser policy is intentionally added. This table is server-only.

create or replace function public.melo_fulfill_stripe_checkout_v39(
  p_event_id text,
  p_session_id text,
  p_environment text,
  p_user_id uuid,
  p_plan_id uuid,
  p_offer_id uuid,
  p_duration_months int,
  p_amount numeric,
  p_currency text default 'THB'
) returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_plan public.subscription_plans%rowtype;
  v_offer public.subscription_plan_offers%rowtype;
  v_fulfillment_id uuid;
  v_subscription_id uuid;
  v_months int;
begin
  -- This RPC must never be callable with a normal browser JWT.
  if auth.role() <> 'service_role' then
    raise exception 'service role required';
  end if;

  if nullif(trim(coalesce(p_event_id,'')),'') is null
     or nullif(trim(coalesce(p_session_id,'')),'') is null then
    raise exception 'stripe event/session id required';
  end if;

  if p_environment not in ('sandbox','live') then
    raise exception 'invalid stripe environment';
  end if;

  if p_user_id is null or p_plan_id is null or p_offer_id is null then
    raise exception 'missing checkout metadata';
  end if;

  select * into v_plan
  from public.subscription_plans
  where id=p_plan_id;

  if v_plan.id is null or v_plan.code='free' then
    raise exception 'invalid paid package';
  end if;

  select * into v_offer
  from public.subscription_plan_offers
  where id=p_offer_id and plan_id=p_plan_id;

  if v_offer.id is null then
    raise exception 'package offer not found';
  end if;

  v_months := greatest(1, p_duration_months);
  if v_offer.duration_months <> v_months then
    raise exception 'checkout duration does not match offer';
  end if;

  -- The unique event/session constraints make Stripe retries idempotent.
  insert into public.stripe_checkout_fulfillments(
    stripe_event_id,stripe_session_id,stripe_environment,
    user_id,plan_id,offer_id,duration_months,amount,currency
  ) values (
    trim(p_event_id),trim(p_session_id),p_environment,
    p_user_id,p_plan_id,p_offer_id,v_months,greatest(0,coalesce(p_amount,0)),upper(coalesce(nullif(trim(p_currency),''),'THB'))
  )
  on conflict do nothing
  returning id into v_fulfillment_id;

  if v_fulfillment_id is null then
    return jsonb_build_object(
      'fulfilled',false,
      'duplicate',true,
      'session_id',p_session_id
    );
  end if;

  update public.user_subscriptions
  set status='replaced'
  where user_id=p_user_id and status='active';

  insert into public.user_subscriptions(
    user_id,plan_id,starts_at,billing_anchor,billing_period_months,expires_at,status
  ) values (
    p_user_id,p_plan_id,now(),now(),v_months,now()+make_interval(months=>v_months),'active'
  )
  returning id into v_subscription_id;

  insert into public.package_transactions(
    user_id,plan_id,transaction_type,amount,currency,note
  ) values (
    p_user_id,p_plan_id,'stripe_purchase',greatest(0,coalesce(p_amount,0)),upper(coalesce(nullif(trim(p_currency),''),'THB')),
    format(
      'Stripe Checkout %s; offer %s; duration %s month(s); environment %s',
      p_session_id,p_offer_id,v_months,p_environment
    )
  );

  return jsonb_build_object(
    'fulfilled',true,
    'duplicate',false,
    'subscription_id',v_subscription_id,
    'plan_id',p_plan_id,
    'offer_id',p_offer_id,
    'duration_months',v_months
  );
end $$;

revoke all on function public.melo_fulfill_stripe_checkout_v39(text,text,text,uuid,uuid,uuid,int,numeric,text) from public;
grant execute on function public.melo_fulfill_stripe_checkout_v39(text,text,text,uuid,uuid,uuid,int,numeric,text) to service_role;

commit;
notify pgrst,'reload schema';
