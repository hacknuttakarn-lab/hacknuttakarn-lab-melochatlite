-- Melo Chat Lite V42 — bundled Boost Add-ons (Profile + Post) + Admin Center parity.
begin;

alter table public.boost_addons
  add column if not exists profile_boost_count int,
  add column if not exists post_boost_count int,
  add column if not exists badge_label text;

alter table public.boost_addons alter column boost_type drop not null;
alter table public.boost_addons alter column boost_count drop not null;

alter table public.boost_addons drop constraint if exists boost_addons_profile_boost_count_check;
alter table public.boost_addons add constraint boost_addons_profile_boost_count_check check (profile_boost_count is null or profile_boost_count > 0);
alter table public.boost_addons drop constraint if exists boost_addons_post_boost_count_check;
alter table public.boost_addons add constraint boost_addons_post_boost_count_check check (post_boost_count is null or post_boost_count > 0);

-- Hide the old separate Profile/Post add-ons from the user catalog, but keep rows for history.
update public.boost_addons
set is_active=false, updated_at=now()
where code in ('profile_3','profile_10','profile_25','post_3','post_10','post_25');

insert into public.boost_addons
  (code,name,boost_type,boost_count,profile_boost_count,post_boost_count,price,credit_days,badge_label,is_active,sort_order,updated_at)
values
  ('boost_starter','Boost Starter',null,null,10,10,99,90,null,true,10,now()),
  ('boost_plus','Boost Plus',null,null,30,30,199,90,'Popular',true,20,now()),
  ('boost_pro','Boost Pro',null,null,75,75,349,90,'Best Value',true,30,now()),
  ('boost_max','Boost Max',null,null,150,150,599,90,null,true,40,now())
on conflict(code) do update set
  name=excluded.name,
  boost_type=null,
  boost_count=null,
  profile_boost_count=excluded.profile_boost_count,
  post_boost_count=excluded.post_boost_count,
  price=excluded.price,
  credit_days=excluded.credit_days,
  badge_label=excluded.badge_label,
  is_active=excluded.is_active,
  sort_order=excluded.sort_order,
  updated_at=now();

-- A bundle creates two credit rows from one Stripe session: one Profile row and one Post row.
alter table public.user_boost_addon_purchases
  drop constraint if exists user_boost_addon_purchases_stripe_session_id_key;
create unique index if not exists user_boost_addon_purchase_session_type_uidx
  on public.user_boost_addon_purchases(stripe_session_id,boost_type)
  where stripe_session_id is not null;

create or replace function public.melo_fulfill_stripe_boost_addon_v42(
  p_event_id text,
  p_session_id text,
  p_environment text,
  p_user_id uuid,
  p_addon_id uuid,
  p_amount numeric,
  p_currency text default 'THB'
) returns jsonb
language plpgsql security definer set search_path=public,auth as $$
declare
  v_addon public.boost_addons%rowtype;
  v_fid uuid;
  v_profile_id uuid;
  v_post_id uuid;
  v_profile int;
  v_post int;
begin
  if auth.role()<>'service_role' then raise exception 'service role required'; end if;
  if p_environment not in ('sandbox','live') or p_user_id is null or p_addon_id is null then
    raise exception 'invalid boost checkout metadata';
  end if;

  select * into v_addon
  from public.boost_addons
  where id=p_addon_id and is_active=true;

  if v_addon.id is null then raise exception 'boost add-on not found'; end if;

  v_profile:=coalesce(v_addon.profile_boost_count,case when v_addon.boost_type='profile' then v_addon.boost_count else 0 end,0);
  v_post:=coalesce(v_addon.post_boost_count,case when v_addon.boost_type='post' then v_addon.boost_count else 0 end,0);
  if v_profile<=0 or v_post<=0 then raise exception 'boost bundle configuration is invalid'; end if;

  insert into public.stripe_boost_addon_fulfillments
    (stripe_event_id,stripe_session_id,stripe_environment,user_id,addon_id,amount,currency)
  values
    (trim(p_event_id),trim(p_session_id),p_environment,p_user_id,p_addon_id,greatest(0,coalesce(p_amount,0)),upper(coalesce(nullif(trim(p_currency),''),'THB')))
  on conflict do nothing returning id into v_fid;

  if v_fid is null then
    return jsonb_build_object('fulfilled',false,'duplicate',true,'session_id',p_session_id);
  end if;

  insert into public.user_boost_addon_purchases
    (user_id,addon_id,boost_type,credit_total,expires_at,stripe_session_id)
  values
    (p_user_id,v_addon.id,'profile',v_profile,now()+make_interval(days=>coalesce(v_addon.credit_days,90)),p_session_id)
  returning id into v_profile_id;

  insert into public.user_boost_addon_purchases
    (user_id,addon_id,boost_type,credit_total,expires_at,stripe_session_id)
  values
    (p_user_id,v_addon.id,'post',v_post,now()+make_interval(days=>coalesce(v_addon.credit_days,90)),p_session_id)
  returning id into v_post_id;

  return jsonb_build_object(
    'fulfilled',true,
    'duplicate',false,
    'profile_purchase_id',v_profile_id,
    'post_purchase_id',v_post_id,
    'profile_credits',v_profile,
    'post_credits',v_post
  );
end $$;
revoke all on function public.melo_fulfill_stripe_boost_addon_v42(text,text,text,uuid,uuid,numeric,text) from public;
grant execute on function public.melo_fulfill_stripe_boost_addon_v42(text,text,text,uuid,uuid,numeric,text) to service_role;

create or replace function public.admin_center_list_boost_addons_v42()
returns setof public.boost_addons
language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin_center_admin() then raise exception 'Admin access required'; end if;
  return query
    select a.* from public.boost_addons a
    where coalesce(a.profile_boost_count,0)>0 or coalesce(a.post_boost_count,0)>0
    order by a.sort_order,a.price,a.created_at;
end $$;
revoke all on function public.admin_center_list_boost_addons_v42() from public;
grant execute on function public.admin_center_list_boost_addons_v42() to authenticated;

create or replace function public.admin_center_save_boost_addon_v42(
  p_id uuid,
  p_code text,
  p_name text,
  p_price numeric,
  p_profile_boost_count int,
  p_post_boost_count int,
  p_credit_days int default 90,
  p_badge_label text default null,
  p_active boolean default true
) returns uuid
language plpgsql security definer set search_path=public as $$
declare
  v_id uuid;
  v_sort int;
begin
  if not public.is_admin_center_admin() then raise exception 'Admin access required'; end if;
  if nullif(trim(p_code),'') is null or nullif(trim(p_name),'') is null then raise exception 'Code and name are required'; end if;
  if coalesce(p_price,0)<=0 then raise exception 'Price must be greater than 0'; end if;
  if coalesce(p_profile_boost_count,0)<=0 or coalesce(p_post_boost_count,0)<=0 then raise exception 'Profile and Post Boost must both be greater than 0'; end if;
  if coalesce(p_credit_days,0)<=0 then raise exception 'Credit days must be greater than 0'; end if;

  if p_id is null then
    select coalesce(max(sort_order),0)+10 into v_sort from public.boost_addons;
    insert into public.boost_addons
      (code,name,boost_type,boost_count,profile_boost_count,post_boost_count,price,credit_days,badge_label,is_active,sort_order,updated_at)
    values
      (lower(trim(p_code)),trim(p_name),null,null,p_profile_boost_count,p_post_boost_count,p_price,p_credit_days,nullif(trim(p_badge_label),''),coalesce(p_active,true),v_sort,now())
    returning id into v_id;
  else
    update public.boost_addons
    set code=lower(trim(p_code)),name=trim(p_name),boost_type=null,boost_count=null,
        profile_boost_count=p_profile_boost_count,post_boost_count=p_post_boost_count,
        price=p_price,credit_days=p_credit_days,badge_label=nullif(trim(p_badge_label),''),
        is_active=coalesce(p_active,true),updated_at=now()
    where id=p_id
    returning id into v_id;
    if v_id is null then raise exception 'Boost add-on not found'; end if;
  end if;

  return v_id;
end $$;
revoke all on function public.admin_center_save_boost_addon_v42(uuid,text,text,numeric,int,int,int,text,boolean) from public;
grant execute on function public.admin_center_save_boost_addon_v42(uuid,text,text,numeric,int,int,int,text,boolean) to authenticated;

commit;
