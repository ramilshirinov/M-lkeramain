-- =====================================================================
-- MULKERA_003 — create_listing / replace_listing_media təmir skripti
-- Supabase SQL Editor-da BİR DƏFƏ işlədin. Təkrar işlətmək təhlükəsizdir (idempotent).
-- Səbəb: "Could not find the function public.create_listing(p_listing, p_media, p_request_id)"
--        → MULKERA_001 miqrasiyası bu verilənlər bazasında tətbiq olunmayıb (və ya yarımçıq qalıb).
-- Bu skript yalnız elan yaratma/redaktə üçün lazım olanları qurur. RLS sərtləşdirməsinə TOXUNMUR.
-- =====================================================================

-- 1) Funksiyanın istifadə etdiyi sütunlar (varsa keçilir)
alter table public.listings add column if not exists owner_kind        text;
alter table public.listings add column if not exists client_request_id uuid;
alter table public.listings add column if not exists sold_at           timestamptz;
alter table public.listings add column if not exists sold_verified     boolean not null default false;
alter table public.listings add column if not exists cover_image       text;
alter table public.listings add column if not exists image_url         text;
alter table public.listings add column if not exists video_url         text;
alter table public.listings add column if not exists title_az          text;
alter table public.listings add column if not exists description_az    text;
alter table public.listings add column if not exists selected_city     text;
alter table public.listings add column if not exists phone_number      text;
alter table public.listings add column if not exists documents         text[];
alter table public.listings add column if not exists yard_sot          numeric(10,2);
alter table public.listings add column if not exists floor             integer;
alter table public.listings add column if not exists floor_total       integer;
alter table public.listings add column if not exists user_id           uuid;

alter table public.listing_photos add column if not exists media_type text default 'image';
alter table public.listing_photos add column if not exists sort_order integer default 0;

-- 2) Constraint-lər (NOT VALID: köhnə sətirlər yoxlanmır, yeniləri yoxlanır → skript qırılmır)
update public.listings set transaction_type = 'rent' where transaction_type = 'long_term_rent';

alter table public.listings drop constraint if exists listings_transaction_type_check;
alter table public.listings add constraint listings_transaction_type_check
  check (transaction_type in ('sale','rent','daily_rent','daily','other')) not valid;

alter table public.listings drop constraint if exists listings_owner_kind_check;
alter table public.listings add constraint listings_owner_kind_check
  check (owner_kind is null or owner_kind in ('owner','realtor','other')) not valid;

-- 3) İndekslər (ON CONFLICT (listing_id, url) və ikiqat göndərmədən qorunma üçün MÜTLƏQDİR)
delete from public.listing_photos a
  using public.listing_photos b
  where a.id > b.id and a.listing_id = b.listing_id and a.url = b.url;

create unique index if not exists uq_listing_media_url
  on public.listing_photos (listing_id, url);
create index if not exists idx_listing_photos_listing
  on public.listing_photos (listing_id, sort_order);
create unique index if not exists uq_listings_owner_request
  on public.listings (owner_id, client_request_id) where client_request_id is not null;

-- 4) Köhnə/uyğunsuz overload-ları təmizlə (PostgREST "ambiguous function" verməsin)
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('create_listing', 'replace_listing_media')
  loop
    execute 'drop function ' || r.sig;
  end loop;
end $$;

-- 5) create_listing — atomik + idempotent
create or replace function public.create_listing(
  p_request_id uuid,
  p_listing    jsonb,
  p_media      jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_id    uuid;
  v_phone text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_request_id is null then raise exception 'request_id_required'; end if;

  -- ikinci klik / təkrar sorğu → eyni elan qaytarılır
  select id into v_id from public.listings
   where owner_id = v_uid and client_request_id = p_request_id;
  if v_id is not null then return v_id; end if;

  v_phone := nullif(trim(p_listing->>'phone_number'), '');
  if v_phone is null then raise exception 'phone_required'; end if;

  if jsonb_typeof(p_media) is distinct from 'array'
     or jsonb_array_length(p_media) = 0 then
    raise exception 'media_required';
  end if;

  if (p_listing->>'owner_kind') is null
     or (p_listing->>'owner_kind') not in ('owner','realtor','other') then
    raise exception 'owner_kind_required';
  end if;

  begin
    insert into public.listings (
      owner_id, user_id, client_request_id,
      title, title_az, description, description_az,
      transaction_type, category_id, district_id,
      city, selected_city, address, latitude, longitude,
      price, currency, area_m2, room_count, floor, floor_total, yard_sot,
      phone_number, documents, owner_kind, status
    ) values (
      v_uid, v_uid, p_request_id,
      p_listing->>'title', coalesce(p_listing->>'title_az', p_listing->>'title'),
      p_listing->>'description', coalesce(p_listing->>'description_az', p_listing->>'description'),
      coalesce(nullif(p_listing->>'transaction_type',''), 'sale'),
      nullif(p_listing->>'category_id','')::bigint,
      nullif(p_listing->>'district_id','')::bigint,
      p_listing->>'city', coalesce(p_listing->>'selected_city', p_listing->>'city'),
      p_listing->>'address',
      nullif(p_listing->>'latitude','')::double precision,
      nullif(p_listing->>'longitude','')::double precision,
      coalesce(nullif(p_listing->>'price','')::numeric, 0),
      coalesce(nullif(p_listing->>'currency',''), 'AZN'),
      nullif(p_listing->>'area_m2','')::numeric,
      nullif(p_listing->>'room_count','')::int,
      nullif(p_listing->>'floor','')::int,
      nullif(p_listing->>'floor_total','')::int,
      nullif(p_listing->>'yard_sot','')::numeric,
      v_phone,
      case when jsonb_typeof(p_listing->'documents') = 'array'
           then array(select jsonb_array_elements_text(p_listing->'documents')) end,
      p_listing->>'owner_kind',
      'active'
    ) returning id into v_id;
  exception when unique_violation then
    -- paralel iki sorğu: ikincisi birincinin elanını qaytarır
    select id into v_id from public.listings
     where owner_id = v_uid and client_request_id = p_request_id;
    return v_id;
  end;

  insert into public.listing_photos (listing_id, url, media_type, sort_order)
  select v_id,
         m->>'url',
         case when m->>'type' = 'video' then 'video' else 'image' end,
         (ord - 1)::int
  from jsonb_array_elements(p_media) with ordinality as t(m, ord)
  where nullif(m->>'url','') is not null
  on conflict (listing_id, url) do nothing;

  update public.listings l set
    cover_image = (select url from public.listing_photos where listing_id = v_id and media_type = 'image' order by sort_order limit 1),
    image_url   = (select url from public.listing_photos where listing_id = v_id and media_type = 'image' order by sort_order limit 1),
    video_url   = (select url from public.listing_photos where listing_id = v_id and media_type = 'video' order by sort_order limit 1)
  where l.id = v_id;

  return v_id;
end $$;

-- 6) replace_listing_media — redaktə səhifəsi üçün
create or replace function public.replace_listing_media(
  p_listing uuid,
  p_media   jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from public.listings where id = p_listing and owner_id = auth.uid()) then
    raise exception 'forbidden';
  end if;
  if jsonb_typeof(p_media) is distinct from 'array'
     or jsonb_array_length(p_media) = 0 then
    raise exception 'media_required';
  end if;

  delete from public.listing_photos where listing_id = p_listing;

  insert into public.listing_photos (listing_id, url, media_type, sort_order)
  select p_listing,
         m->>'url',
         case when m->>'type' = 'video' then 'video' else 'image' end,
         (ord - 1)::int
  from jsonb_array_elements(p_media) with ordinality as t(m, ord)
  where nullif(m->>'url','') is not null
  on conflict (listing_id, url) do nothing;

  update public.listings set
    cover_image = (select url from public.listing_photos where listing_id = p_listing and media_type = 'image' order by sort_order limit 1),
    image_url   = (select url from public.listing_photos where listing_id = p_listing and media_type = 'image' order by sort_order limit 1),
    video_url   = (select url from public.listing_photos where listing_id = p_listing and media_type = 'video' order by sort_order limit 1),
    updated_at  = now()
  where id = p_listing;
end $$;

-- 7) İcazələr: yalnız giriş etmiş istifadəçilər çağıra bilər
revoke all on function public.create_listing(uuid, jsonb, jsonb)       from public, anon;
revoke all on function public.replace_listing_media(uuid, jsonb)       from public, anon;
grant execute on function public.create_listing(uuid, jsonb, jsonb)    to authenticated;
grant execute on function public.replace_listing_media(uuid, jsonb)    to authenticated;

-- 8) PostgREST schema cache-i yenilə (bunsuz 404 davam edə bilər)
notify pgrst, 'reload schema';
