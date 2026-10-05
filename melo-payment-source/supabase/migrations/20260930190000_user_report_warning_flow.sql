
-- Melo Chat Lite: Admin report moderation + member warning/notice flow.
create table if not exists public.admin_user_notices(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_id uuid references public.user_reports(id) on delete set null,
  level text not null default 'warning' check(level in ('notice','warning','action_required')),
  subject text not null,
  message text not null,
  admin_note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
alter table public.admin_user_notices enable row level security;
drop policy if exists own_admin_notices_read on public.admin_user_notices;
create policy own_admin_notices_read on public.admin_user_notices for select to authenticated using(user_id=auth.uid());

alter table public.user_reports add column if not exists admin_note text;

drop function if exists public.admin_center_list_reports();
create function public.admin_center_list_reports()
returns table(
 id uuid, reported_user_id uuid, member_code text, reported_email text, reported_name text,
 reason text, details text, report_type text, status text, created_at timestamptz,
 admin_note text, report_count bigint, warning_count bigint, is_suspended boolean
)
language sql security definer set search_path=public,auth as $$
 select r.id,r.reported_user_id,
   coalesce('ME'||lpad(mc.member_number::text,6,'0'),'—'),
   u.email,
   coalesce(p.display_name,nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''),'Melo member'),
   r.reason,r.details,r.report_type,r.status,r.created_at,r.admin_note,
   (select count(*) from public.user_reports rr where rr.reported_user_id=r.reported_user_id),
   (select count(*) from public.admin_user_notices n where n.user_id=r.reported_user_id),
   coalesce(st.is_suspended,false)
 from public.user_reports r
 left join auth.users u on u.id=r.reported_user_id
 left join public.profiles p on p.id=r.reported_user_id
 left join public.member_registry mc on mc.user_id=r.reported_user_id
 left join public.user_admin_status st on st.user_id=r.reported_user_id
 where public.admin_center_has_permission('user_reports_view')
 order by r.created_at desc limit 500
$$;
grant execute on function public.admin_center_list_reports() to authenticated;

create or replace function public.admin_center_send_user_warning(
 p_report_id uuid,p_level text,p_subject text,p_message text,p_admin_note text default null
) returns uuid
language plpgsql security definer set search_path=public,auth as $$
declare v_report public.user_reports%rowtype; v_id uuid;
begin
 if not public.admin_center_has_permission('user_reports_view') then raise exception 'permission denied'; end if;
 if p_level not in ('notice','warning','action_required') then raise exception 'invalid notice level'; end if;
 if nullif(trim(p_subject),'') is null or nullif(trim(p_message),'') is null then raise exception 'subject and message are required'; end if;
 select * into v_report from public.user_reports where id=p_report_id;
 if not found then raise exception 'report not found'; end if;
 insert into public.admin_user_notices(user_id,report_id,level,subject,message,admin_note,created_by)
 values(v_report.reported_user_id,p_report_id,p_level,trim(p_subject),trim(p_message),nullif(trim(p_admin_note),''),auth.uid())
 returning id into v_id;
 update public.user_reports set status='warning_sent',admin_note=coalesce(nullif(trim(p_admin_note),''),admin_note) where id=p_report_id;
 perform public.admin_center_write_audit('user_warning_sent',v_report.reported_user_id,
   jsonb_build_object('report_id',p_report_id,'level',p_level,'subject',trim(p_subject)));
 return v_id;
end $$;
grant execute on function public.admin_center_send_user_warning(uuid,text,text,text,text) to authenticated;

create or replace function public.admin_center_update_report_status(
 p_report_id uuid,p_status text,p_admin_note text default null
) returns boolean
language plpgsql security definer set search_path=public,auth as $$
declare v_user uuid;
begin
 if not public.admin_center_has_permission('user_reports_view') then raise exception 'permission denied'; end if;
 if p_status not in ('new','reviewing','warning_sent','resolved','dismissed') then raise exception 'invalid report status'; end if;
 update public.user_reports set status=p_status,admin_note=coalesce(nullif(trim(p_admin_note),''),admin_note),
   resolved_at=case when p_status in ('resolved','dismissed') then now() else null end,
   resolved_by=case when p_status in ('resolved','dismissed') then auth.uid() else null end
 where id=p_report_id returning reported_user_id into v_user;
 if v_user is null then raise exception 'report not found'; end if;
 perform public.admin_center_write_audit('user_report_status_changed',v_user,jsonb_build_object('report_id',p_report_id,'status',p_status));
 return true;
end $$;
grant execute on function public.admin_center_update_report_status(uuid,text,text) to authenticated;

create or replace function public.mark_admin_user_notice_read(p_notice_id uuid) returns boolean
language plpgsql security definer set search_path=public as $$
begin
 update public.admin_user_notices set read_at=coalesce(read_at,now()) where id=p_notice_id and user_id=auth.uid();
 return found;
end $$;
grant execute on function public.mark_admin_user_notice_read(uuid) to authenticated;
