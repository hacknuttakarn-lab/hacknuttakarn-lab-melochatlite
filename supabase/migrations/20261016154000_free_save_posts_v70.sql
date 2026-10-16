-- Melo Chat Lite V70
-- Allow Free members to save/unsave Feed posts.
-- Existing Match/Profile/Comment/Chat/Post limits are unchanged.

begin;

update public.subscription_plans
set can_save_post = true,
    updated_at = now()
where lower(code) = 'free';

commit;
