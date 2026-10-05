begin;

create table if not exists public.web_push_subscriptions(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists web_push_subscriptions_user_idx on public.web_push_subscriptions(user_id);
alter table public.web_push_subscriptions enable row level security;
drop policy if exists web_push_subscriptions_own_select on public.web_push_subscriptions;
create policy web_push_subscriptions_own_select on public.web_push_subscriptions for select to authenticated using(user_id=auth.uid());
drop policy if exists web_push_subscriptions_own_insert on public.web_push_subscriptions;
create policy web_push_subscriptions_own_insert on public.web_push_subscriptions for insert to authenticated with check(user_id=auth.uid());
drop policy if exists web_push_subscriptions_own_update on public.web_push_subscriptions;
create policy web_push_subscriptions_own_update on public.web_push_subscriptions for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists web_push_subscriptions_own_delete on public.web_push_subscriptions;
create policy web_push_subscriptions_own_delete on public.web_push_subscriptions for delete to authenticated using(user_id=auth.uid());

create or replace function public.admin_center_get_user_documents(p_user_id uuid)
returns table(
 id uuid,user_id uuid,status text,submitted_at timestamptz,reviewed_at timestamptz,
 legal_first_name_en text,legal_last_name_en text,document_type text,document_number text,
 identity_document_path text,selfie_path text,reviewer_notes text
)
language plpgsql security definer set search_path=public as $$
begin
  if not exists(
    select 1 from public.admin_users a where a.user_id=auth.uid() and coalesce(a.is_active,true)=true
    and (a.role='super_admin' or coalesce((a.permissions->>'users_view')::boolean,false) or coalesce((a.permissions->>'verification_view')::boolean,false))
  ) then raise exception 'Admin access required'; end if;
  return query
  select v.id,v.user_id,v.status,v.submitted_at,v.reviewed_at,v.legal_first_name_en,v.legal_last_name_en,
         v.document_type,v.document_number,v.identity_document_path,v.selfie_path,v.reviewer_notes
  from public.verification_requests v where v.user_id=p_user_id order by v.submitted_at desc nulls last limit 1;
end;$$;
grant execute on function public.admin_center_get_user_documents(uuid) to authenticated;

commit;
