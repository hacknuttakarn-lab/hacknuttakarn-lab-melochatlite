-- Admin Verification Review UI support for fresh Supabase.
-- Adds profile context to the queue and permits active admins to read private verification files.

create or replace function public.get_admin_verification_queue(p_status text default 'pending',p_limit integer default 200)
returns table(id uuid,user_id uuid,user_email text,display_name text,country text,nationality text,status text,submitted_at timestamptz,legal_first_name_en text,legal_last_name_en text,document_type text,document_number text,selfie_status text,identity_status text,selfie_path text,identity_document_path text,reviewer_notes text,reviewed_at timestamptz)
language plpgsql security definer set search_path=public,auth as $$
begin
  if not public.melo_is_verification_admin() then raise exception 'Admin access required'; end if;
  return query
  select v.id,v.user_id,u.email::text,
    coalesce(nullif(u.raw_user_meta_data->>'display_name',''),nullif(u.raw_user_meta_data->>'full_name',''),nullif(concat_ws(' ',v.legal_first_name_en,v.legal_last_name_en),''),split_part(u.email,'@',1),'Melo User')::text,
    coalesce(u.raw_user_meta_data->>'country_name',u.raw_user_meta_data->>'country',u.raw_user_meta_data->>'country_code','')::text,
    coalesce(u.raw_user_meta_data->>'nationality','')::text,
    v.status,v.submitted_at,v.legal_first_name_en,v.legal_last_name_en,v.document_type,v.document_number,v.selfie_status,v.identity_status,v.selfie_path,v.identity_document_path,v.reviewer_notes,v.reviewed_at
  from public.verification_requests v
  left join auth.users u on u.id=v.user_id
  where (p_status is null or p_status='' or v.status=p_status)
  order by v.submitted_at desc limit greatest(1,least(coalesce(p_limit,200),500));
end $$;
grant execute on function public.get_admin_verification_queue(text,integer) to authenticated;

drop policy if exists verification_storage_select_admin on storage.objects;
create policy verification_storage_select_admin on storage.objects for select to authenticated
using (bucket_id='verification-private' and public.melo_is_verification_admin());
