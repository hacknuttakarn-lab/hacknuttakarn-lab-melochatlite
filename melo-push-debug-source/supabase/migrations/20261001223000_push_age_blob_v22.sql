-- Melo Chat Lite V22
-- 1) Durable Web Push subscription registration across account switches.
-- 2) Server-side 20+ age enforcement on profiles/onboarding.
-- 3) Reliable Support -> notifications rows so closed-app Web Push can fire.

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

create or replace function public.register_my_web_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth_key text,
  p_user_agent text default null
) returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if nullif(trim(p_endpoint),'') is null or nullif(trim(p_p256dh),'') is null or nullif(trim(p_auth_key),'') is null then
    raise exception 'PUSH_SUBSCRIPTION_INVALID';
  end if;
  -- A browser endpoint belongs to the currently signed-in Melo account. This
  -- prevents an endpoint from staying bound to a previously logged-out user.
  delete from public.web_push_subscriptions where endpoint=p_endpoint and user_id<>auth.uid();
  insert into public.web_push_subscriptions(user_id,endpoint,p256dh,auth_key,user_agent,updated_at)
  values(auth.uid(),p_endpoint,p_p256dh,p_auth_key,p_user_agent,now())
  on conflict(endpoint) do update set
    user_id=excluded.user_id,
    p256dh=excluded.p256dh,
    auth_key=excluded.auth_key,
    user_agent=excluded.user_agent,
    updated_at=now();
end;$$;
grant execute on function public.register_my_web_push_subscription(text,text,text,text) to authenticated;

create or replace function public.unregister_my_web_push_subscription(p_endpoint text)
returns void language sql security definer set search_path=public as $$
  delete from public.web_push_subscriptions where user_id=auth.uid() and endpoint=p_endpoint;
$$;
grant execute on function public.unregister_my_web_push_subscription(text) to authenticated;

-- Database-level 20+ rule. UI validation already exists in onboarding; this
-- blocks bypass through REST/RPC/DevTools as well.
create or replace function public.melo_enforce_minimum_age_20()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.date_of_birth is not null and new.date_of_birth > (current_date - interval '20 years')::date then
    raise exception 'AGE_RESTRICTION_20' using errcode='22023';
  end if;
  if coalesce(new.onboarding_completed,false)=true and new.date_of_birth is null then
    raise exception 'DATE_OF_BIRTH_REQUIRED' using errcode='22023';
  end if;
  return new;
end;$$;
drop trigger if exists trg_profiles_minimum_age_20 on public.profiles;
create trigger trg_profiles_minimum_age_20
before insert or update of date_of_birth,onboarding_completed on public.profiles
for each row execute function public.melo_enforce_minimum_age_20();

-- Keep the compatibility notification writer available even if an older V4/V5
-- migration was skipped on a deployment.
create or replace function public.melo_insert_notification_compat(
  p_recipient uuid,p_type text,p_actor uuid,p_entity uuid,p_title text,p_body text,p_href text,
  p_metadata jsonb default '{}'::jsonb,p_created_at timestamptz default now()
) returns boolean
language plpgsql security definer set search_path=public as $$
declare
  v_cols text[]:=array[]::text[]; v_vals text[]:=array[]::text[]; v_has_recipient boolean:=false;
  v_sql text; v_meta jsonb:=coalesce(p_metadata,'{}'::jsonb)||jsonb_build_object('href',p_href,'type',p_type,'actor_id',p_actor,'entity_id',p_entity); c text;
begin
  if to_regclass('public.notifications') is null then return false; end if;
  foreach c in array array['user_id','recipient_id','recipient_user_id'] loop
    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name=c) then
      v_cols:=array_append(v_cols,quote_ident(c)); v_vals:=array_append(v_vals,'$1'); v_has_recipient:=true;
    end if;
  end loop;
  if not v_has_recipient then return false; end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name='type') then v_cols:=array_append(v_cols,'type'); v_vals:=array_append(v_vals,'$2'); end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name='notification_type') then v_cols:=array_append(v_cols,'notification_type'); v_vals:=array_append(v_vals,'$2'); end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name='kind') then v_cols:=array_append(v_cols,'kind'); v_vals:=array_append(v_vals,'$2'); end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name='actor_id') then v_cols:=array_append(v_cols,'actor_id'); v_vals:=array_append(v_vals,'$3'); end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name='entity_id') then v_cols:=array_append(v_cols,'entity_id'); v_vals:=array_append(v_vals,'$4'); end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name='title') then v_cols:=array_append(v_cols,'title'); v_vals:=array_append(v_vals,'$5'); end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name='subject') then v_cols:=array_append(v_cols,'subject'); v_vals:=array_append(v_vals,'$5'); end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name='body') then v_cols:=array_append(v_cols,'body'); v_vals:=array_append(v_vals,'$6'); end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name='message') then v_cols:=array_append(v_cols,'message'); v_vals:=array_append(v_vals,'$6'); end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name='href') then v_cols:=array_append(v_cols,'href'); v_vals:=array_append(v_vals,'$7'); end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name='is_read') then v_cols:=array_append(v_cols,'is_read'); v_vals:=array_append(v_vals,'false'); end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name='read') then v_cols:=array_append(v_cols,'read'); v_vals:=array_append(v_vals,'false'); end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name='seen') then v_cols:=array_append(v_cols,'seen'); v_vals:=array_append(v_vals,'false'); end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name='metadata') then v_cols:=array_append(v_cols,'metadata'); v_vals:=array_append(v_vals,'$8::jsonb'); end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name='data') then v_cols:=array_append(v_cols,'data'); v_vals:=array_append(v_vals,'$8::jsonb'); end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name='payload') then v_cols:=array_append(v_cols,'payload'); v_vals:=array_append(v_vals,'$8::jsonb'); end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name='created_at') then v_cols:=array_append(v_cols,'created_at'); v_vals:=array_append(v_vals,'$9'); end if;
  v_sql:=format('insert into public.notifications (%s) values (%s)',array_to_string(v_cols,','),array_to_string(v_vals,','));
  execute v_sql using p_recipient,p_type,p_actor,p_entity,p_title,p_body,p_href,v_meta,p_created_at;
  return true;
exception when others then raise warning 'melo_insert_notification_compat failed: %',sqlerrm; return false;
end;$$;
revoke all on function public.melo_insert_notification_compat(uuid,text,uuid,uuid,text,text,text,jsonb,timestamptz) from public;

create or replace function public.support_message_notifications()
returns trigger language plpgsql security definer set search_path=public,auth as $$
declare v_thread public.support_threads%rowtype; v_admin record; v_name text;
begin
  select * into v_thread from public.support_threads where id=new.thread_id;
  if v_thread.id is null then return new; end if;
  if new.sender_role='member' then
    select coalesce(nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''),nullif(p.display_name,''),u.raw_user_meta_data->>'full_name',split_part(u.email,'@',1),'Melo member')
      into v_name from auth.users u left join public.profiles p on p.id=u.id where u.id=v_thread.user_id;
    for v_admin in select a.user_id from public.admin_users a where coalesce(a.is_active,true)=true and (a.role in('admin','super_admin') or coalesce((a.permissions->>'support_chat_view')::boolean,false)) loop
      perform public.melo_insert_notification_compat(v_admin.user_id,'support_message_admin',v_thread.user_id,new.id,'ข้อความใหม่จาก Melo Chat Support',coalesce(v_name,'Melo member')||' ส่งข้อความถึงทีมสนับสนุน','/admin?support_thread='||v_thread.id::text,jsonb_build_object('support_thread_id',v_thread.id,'support_message_id',new.id,'support_context','admin_inbox'),new.created_at);
    end loop;
  elsif new.sender_role='admin' then
    perform public.melo_insert_notification_compat(v_thread.user_id,'support_message_user',new.sender_id,new.id,'มีการตอบกลับจาก Melo Chat Support','ทีมสนับสนุนตอบกลับข้อความของคุณ กดเพื่ออ่าน','/support/chat',jsonb_build_object('support_thread_id',v_thread.id,'support_message_id',new.id,'support_context','member_support'),new.created_at);
  end if;
  return new;
exception when others then raise warning 'Support notification failed: %',sqlerrm; return new;
end;$$;
drop trigger if exists support_messages_notification_trg on public.support_messages;
create trigger support_messages_notification_trg after insert on public.support_messages for each row execute function public.support_message_notifications();

commit;
