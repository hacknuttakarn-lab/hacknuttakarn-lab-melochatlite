-- Melo Chat Support inbox: member <-> admin workspace.
create table if not exists public.support_threads (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 subject text, status text not null default 'open' check(status in('open','closed')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists support_threads_one_open_per_user on public.support_threads(user_id) where status='open';
create table if not exists public.support_messages (
 id uuid primary key default gen_random_uuid(), thread_id uuid not null references public.support_threads(id) on delete cascade,
 sender_id uuid not null references auth.users(id) on delete cascade, sender_role text not null check(sender_role in('member','admin')),
 body text not null check(length(btrim(body)) between 1 and 5000), message_type text not null default 'text', metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index if not exists support_messages_thread_created_idx on public.support_messages(thread_id,created_at);

create or replace function public.support_is_admin(p_user uuid default auth.uid()) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.admin_users a where a.user_id=p_user and coalesce(a.is_active,true)=true and a.role in('admin','super_admin'));
$$;
create or replace function public.support_ensure_my_thread(p_subject text default null) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select id into v_id from public.support_threads where user_id=auth.uid() and status='open' order by created_at desc limit 1;
 if v_id is null then insert into public.support_threads(user_id,subject) values(auth.uid(),nullif(btrim(p_subject),'')) returning id into v_id;
 elsif p_subject is not null then update public.support_threads set subject=coalesce(subject,nullif(btrim(p_subject),'')),updated_at=now() where id=v_id; end if;
 return v_id; end $$;
grant execute on function public.support_ensure_my_thread(text) to authenticated;

alter table public.support_threads enable row level security; alter table public.support_messages enable row level security;
drop policy if exists support_threads_member_select on public.support_threads; create policy support_threads_member_select on public.support_threads for select to authenticated using(user_id=auth.uid() or public.support_is_admin());
drop policy if exists support_messages_select on public.support_messages; create policy support_messages_select on public.support_messages for select to authenticated using(exists(select 1 from public.support_threads t where t.id=thread_id and (t.user_id=auth.uid() or public.support_is_admin())));
drop policy if exists support_messages_insert on public.support_messages; create policy support_messages_insert on public.support_messages for insert to authenticated with check(sender_id=auth.uid() and exists(select 1 from public.support_threads t where t.id=thread_id and ((sender_role='member' and t.user_id=auth.uid()) or (sender_role='admin' and public.support_is_admin()))));

create or replace function public.support_touch_thread() returns trigger language plpgsql security definer set search_path=public as $$ begin update public.support_threads set updated_at=now() where id=new.thread_id; return new; end $$;
drop trigger if exists support_messages_touch_thread on public.support_messages; create trigger support_messages_touch_thread after insert on public.support_messages for each row execute function public.support_touch_thread();

create or replace view public.support_admin_threads as
select t.id,t.user_id,t.subject,t.status,t.created_at,t.updated_at,u.email as member_email,coalesce(nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''),u.email) as member_name
from public.support_threads t join auth.users u on u.id=t.user_id left join public.profiles p on p.id=t.user_id
where public.support_is_admin();
grant select on public.support_admin_threads to authenticated;
