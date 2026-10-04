-- Melo Chat Lite V62 — durable closed-app Web Push dispatcher
-- Fixes the missing server-side bridge from public.notifications to the
-- send-web-push Edge Function. This is what allows notifications to arrive
-- while the browser/app is backgrounded, closed, or the device is locked.
--
-- REQUIRED BEFORE TESTING:
-- Store these TWO values in Supabase Vault (see README_APPLY_PUSH_V62.txt):
--   melo_push_function_url      = https://<PROJECT_REF>.supabase.co/functions/v1/send-web-push
--   melo_push_webhook_secret   = the same MELO_PUSH_WEBHOOK_SECRET used by the Edge Function

begin;

create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

create or replace function public.melo_dispatch_web_push_v62()
returns trigger
language plpgsql
security definer
set search_path=public,extensions,vault
as $$
declare
  v_url text;
  v_secret text;
  v_request_id bigint;
begin
  select decrypted_secret into v_url
  from vault.decrypted_secrets
  where name='melo_push_function_url'
  order by created_at desc
  limit 1;

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name='melo_push_webhook_secret'
  order by created_at desc
  limit 1;

  if nullif(trim(coalesce(v_url,'')),'') is null then
    raise warning 'Melo Push V62: Vault secret melo_push_function_url is missing';
    return new;
  end if;
  if nullif(trim(coalesce(v_secret,'')),'') is null then
    raise warning 'Melo Push V62: Vault secret melo_push_webhook_secret is missing';
    return new;
  end if;

  select net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'content-type','application/json',
      'x-melo-webhook-secret',v_secret
    ),
    body := jsonb_build_object(
      'type','INSERT',
      'table','notifications',
      'schema','public',
      'record',to_jsonb(new)
    ),
    timeout_milliseconds := 10000
  ) into v_request_id;

  return new;
exception when others then
  -- Notification insertion itself must never fail merely because push delivery
  -- is temporarily unavailable.
  raise warning 'Melo Push V62 dispatch failed: %', sqlerrm;
  return new;
end;
$$;

revoke all on function public.melo_dispatch_web_push_v62() from public;

drop trigger if exists melo_web_push_dispatch_v62 on public.notifications;
create trigger melo_web_push_dispatch_v62
after insert on public.notifications
for each row execute function public.melo_dispatch_web_push_v62();

commit;

notify pgrst, 'reload schema';
