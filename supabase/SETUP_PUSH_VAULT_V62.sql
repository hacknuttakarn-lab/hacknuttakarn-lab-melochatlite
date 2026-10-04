-- Melo Chat Lite V62 — ONE-TIME configuration template
-- Replace BOTH placeholders before running this file in Supabase SQL Editor.
-- Do not commit a real secret to Git and do not expose it to NEXT_PUBLIC_*.

-- 1) Edge Function URL for your Melo Chat Supabase project
select vault.create_secret(
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-web-push',
  'melo_push_function_url',
  'Melo Chat V62 Web Push Edge Function URL'
);

-- 2) MUST be exactly the same value as the Edge Function secret:
--    MELO_PUSH_WEBHOOK_SECRET
select vault.create_secret(
  'REPLACE_WITH_THE_SAME_LONG_RANDOM_MELO_PUSH_WEBHOOK_SECRET',
  'melo_push_webhook_secret',
  'Melo Chat V62 Web Push dispatcher secret'
);
