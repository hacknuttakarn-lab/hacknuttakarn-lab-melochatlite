-- Melo Chat Lite - Admin Center: cancellable package transactions with audit trail
alter table public.package_transactions add column if not exists status text not null default 'completed';
alter table public.package_transactions add column if not exists cancelled_at timestamptz;
alter table public.package_transactions add column if not exists cancelled_by uuid references auth.users(id) on delete set null;

drop function if exists public.admin_center_list_sales();
create function public.admin_center_list_sales()
returns table(id uuid,user_id uuid,email text,plan_code text,plan_name text,transaction_type text,amount numeric,status text,cancelled_at timestamptz,created_at timestamptz)
language sql security definer set search_path=public,auth as $$
 select t.id,t.user_id,u.email,p.code,p.name,t.transaction_type,t.amount,t.status,t.cancelled_at,t.created_at
 from public.package_transactions t
 left join auth.users u on u.id=t.user_id
 left join public.subscription_plans p on p.id=t.plan_id
 where public.is_admin_center_admin()
 order by t.created_at desc limit 2000
$$;
grant execute on function public.admin_center_list_sales() to authenticated;

create or replace function public.admin_center_cancel_transaction(p_transaction_id uuid)
returns boolean language plpgsql security definer set search_path=public,auth as $$
declare v_status text;
begin
 if not public.is_admin_center_admin() then raise exception 'admin only'; end if;
 select status into v_status from public.package_transactions where id=p_transaction_id for update;
 if not found then raise exception 'transaction not found'; end if;
 if v_status='cancelled' then return true; end if;
 update public.package_transactions
 set status='cancelled',cancelled_at=now(),cancelled_by=auth.uid(),
     note=concat_ws(' | ',nullif(note,''),'Cancelled by admin')
 where id=p_transaction_id;
 return true;
end $$;
grant execute on function public.admin_center_cancel_transaction(uuid) to authenticated;
