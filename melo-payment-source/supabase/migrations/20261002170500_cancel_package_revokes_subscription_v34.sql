-- Melo Chat Lite V34
-- Cancelling an admin package transaction must also revoke the matching active subscription.
-- If no active paid subscription remains, melo_plan_context_v25() naturally falls back to Free.

create or replace function public.admin_center_cancel_transaction(p_transaction_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_tx public.package_transactions%rowtype;
  v_sub_id uuid;
begin
  if not public.admin_center_has_permission('package_transactions_cancel') then
    raise exception 'package_transactions_cancel permission required';
  end if;

  select * into v_tx
  from public.package_transactions
  where id=p_transaction_id
  for update;

  if v_tx.id is null then
    raise exception 'transaction not found';
  end if;

  -- Allow an already-cancelled transaction to repair an old subscription left active
  -- by the previous implementation. Otherwise mark the sale as cancelled now.
  if coalesce(v_tx.status,'completed') <> 'cancelled' then
    update public.package_transactions
    set status='cancelled',
        cancelled_at=now(),
        cancelled_by=auth.uid(),
        note=concat_ws(' | ',nullif(note,''),'Cancelled by admin; subscription revoked')
    where id=p_transaction_id;
  end if;

  -- Package assignment creates user_subscriptions immediately before package_transactions.
  -- Match the subscription by user + plan + start time near the transaction, so cancelling
  -- an old sale cannot cancel a later purchase of the same package.
  if v_tx.transaction_type in ('admin_package_change','admin_renewal','admin_renewal_v2') then
    select s.id into v_sub_id
    from public.user_subscriptions s
    where s.user_id=v_tx.user_id
      and s.plan_id=v_tx.plan_id
      and s.status='active'
      and abs(extract(epoch from (coalesce(s.starts_at,s.created_at)-v_tx.created_at))) <= 900
    order by coalesce(s.starts_at,s.created_at) desc
    limit 1
    for update;

    if v_sub_id is not null then
      update public.user_subscriptions
      set status='cancelled',
          expires_at=least(coalesce(expires_at,now()),now())
      where id=v_sub_id;
    end if;
  end if;

  perform public.admin_center_write_audit(
    'package_transaction_cancelled',
    v_tx.user_id,
    jsonb_build_object(
      'transaction_id',p_transaction_id,
      'plan_id',v_tx.plan_id,
      'subscription_id',v_sub_id,
      'subscription_revoked',v_sub_id is not null
    )
  );

  return true;
end $$;

revoke all on function public.admin_center_cancel_transaction(uuid) from public;
grant execute on function public.admin_center_cancel_transaction(uuid) to authenticated;

-- Repair historical admin package cancellations made before V34 where the transaction
-- was cancelled but its matching subscription was accidentally left active.
with matches as (
  select distinct on (t.id)
    t.id as transaction_id,
    s.id as subscription_id
  from public.package_transactions t
  join public.user_subscriptions s
    on s.user_id=t.user_id
   and s.plan_id=t.plan_id
   and s.status='active'
   and abs(extract(epoch from (coalesce(s.starts_at,s.created_at)-t.created_at))) <= 900
  where t.status='cancelled'
    and t.transaction_type in ('admin_package_change','admin_renewal','admin_renewal_v2')
  order by t.id, coalesce(s.starts_at,s.created_at) desc
)
update public.user_subscriptions s
set status='cancelled',
    expires_at=least(coalesce(s.expires_at,now()),now())
from matches m
where s.id=m.subscription_id;

notify pgrst,'reload schema';
