-- Melo Chat Lite: notify eligible admins when members submit verification or user reports.
-- Uses jsonb_populate_record so it tolerates the currently deployed notifications table
-- having additional columns. Notification RLS continues to decide what each admin can read.

create or replace function public.melo_notify_admins_for_member_action()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_admin record;
  v_actor uuid;
  v_entity uuid;
  v_type text;
  v_title text;
  v_body text;
  v_href text;
  v_permission text;
  v_payload jsonb;
begin
  if tg_table_name = 'verification_requests' then
    -- Notify only when a member actually submits/resubmits a pending request.
    if coalesce(new.status,'') <> 'pending' then return new; end if;
    if tg_op = 'UPDATE' and new.submitted_at is not distinct from old.submitted_at then return new; end if;
    v_actor := new.user_id;
    v_entity := new.id;
    v_type := 'admin_verification_submitted';
    v_title := 'มีคำขอยืนยันตัวตนใหม่';
    v_body := 'สมาชิกส่งเอกสารยืนยันตัวตนใหม่ กรุณาตรวจสอบใน Admin Center';
    v_href := '/admin?tab=review';
    v_permission := 'verification_view';
  elsif tg_table_name = 'user_reports' then
    v_actor := new.reporter_user_id;
    v_entity := new.id;
    v_type := 'admin_user_report_submitted';
    v_title := 'มีรายงานผู้ใช้ใหม่';
    v_body := 'สมาชิกส่งรายงานผู้ใช้ใหม่ กรุณาตรวจสอบใน Admin Center';
    v_href := '/admin?tab=reports';
    v_permission := 'user_reports_view';
  else
    return new;
  end if;

  for v_admin in
    select a.user_id
    from public.admin_users a
    where coalesce(a.is_active,true) = true
      and (
        a.role = 'super_admin'
        or coalesce((a.permissions ->> v_permission)::boolean,false)
      )
  loop
    v_payload := jsonb_build_object(
      'user_id', v_admin.user_id,
      'recipient_id', v_admin.user_id,
      'recipient_user_id', v_admin.user_id,
      'type', v_type,
      'notification_type', v_type,
      'actor_id', v_actor,
      'entity_id', v_entity,
      'title', v_title,
      'body', v_body,
      'message', v_body,
      'is_read', false,
      'read', false,
      'created_at', now(),
      'metadata', jsonb_build_object(
        'href', v_href,
        'admin_event', true,
        'actor_id', v_actor,
        'entity_id', v_entity,
        'type', v_type
      )
    );

    -- Extra keys are ignored by jsonb_populate_record; existing table defaults fill omitted fields.
    execute 'insert into public.notifications select * from jsonb_populate_record(null::public.notifications, $1)'
      using v_payload;
  end loop;

  return new;
exception
  when undefined_table then
    -- Do not block the member action if notifications have not been provisioned yet.
    return new;
  when others then
    -- Notifications are secondary; submission/report must never fail because notification delivery failed.
    raise warning 'Melo admin notification failed: %', sqlerrm;
    return new;
end;
$$;

drop trigger if exists trg_melo_admin_verification_notification on public.verification_requests;
create trigger trg_melo_admin_verification_notification
after insert or update of submitted_at, status on public.verification_requests
for each row execute function public.melo_notify_admins_for_member_action();

drop trigger if exists trg_melo_admin_user_report_notification on public.user_reports;
create trigger trg_melo_admin_user_report_notification
after insert on public.user_reports
for each row execute function public.melo_notify_admins_for_member_action();
