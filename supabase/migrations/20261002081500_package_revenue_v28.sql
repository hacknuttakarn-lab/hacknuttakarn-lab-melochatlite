begin;

-- Admin package assignment is a recorded package sale at the selected list price.
create or replace function public.admin_center_assign_plan_v25(
  p_user_id uuid,
  p_plan_id uuid,
  p_billing_months int default 1
) returns boolean
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_plan public.subscription_plans%rowtype;
  v_months int := case when p_billing_months in (1,3,6) then p_billing_months else 1 end;
  v_amount numeric;
begin
  if not public.is_admin_center_admin() then raise exception 'admin only'; end if;
  select * into v_plan from public.subscription_plans where id=p_plan_id and is_active=true;
  if v_plan.id is null then raise exception 'package not found or inactive'; end if;

  v_amount := case v_months
    when 3 then coalesce(v_plan.price_3_months,0)
    when 6 then coalesce(v_plan.price_6_months,0)
    else coalesce(v_plan.price_1_month,v_plan.price,0)
  end;

  update public.user_subscriptions set status='replaced' where user_id=p_user_id and status='active';
  insert into public.user_subscriptions(user_id,plan_id,starts_at,billing_anchor,billing_period_months,expires_at,status)
  values(p_user_id,v_plan.id,now(),now(),v_months,now()+make_interval(months=>v_months),'active');

  insert into public.package_transactions(user_id,plan_id,transaction_type,amount,note)
  values(p_user_id,v_plan.id,'admin_package_change',v_amount,format('Assigned by admin for %s month(s); listed price %s THB',v_months,v_amount));

  perform public.admin_center_write_audit('package_assigned',p_user_id,jsonb_build_object('plan_id',p_plan_id,'billing_months',v_months,'listed_price',v_amount));
  return true;
end $$;

revoke all on function public.admin_center_assign_plan_v25(uuid,uuid,int) from public;
grant execute on function public.admin_center_assign_plan_v25(uuid,uuid,int) to authenticated;

-- Repair V25 admin assignments that recorded amount=0 while already preserving
-- the selected list price inside note, so current package reports become accurate.
update public.package_transactions
set amount = substring(note from 'listed price ([0-9]+(?:[.][0-9]+)?) THB')::numeric
where transaction_type='admin_package_change'
  and coalesce(amount,0)=0
  and note ~ 'listed price [0-9]+(?:[.][0-9]+)? THB';

commit;
notify pgrst, 'reload schema';
