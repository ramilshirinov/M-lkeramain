-- =====================================================================
-- MÜLKERA 001 — Düzəlişlər miqrasiyası (Supabase SQL Editor-da bir dəfə çalışdırın)
-- Təkrar çalışdırmaq təhlükəsizdir (idempotent).
-- =====================================================================

-- ---------- 1. Rol yüksəltmə boşluğunu bağla (S2) ----------
create or replace function public.handle_new_user()
returns trigger as $$
declare v_role text;
begin
  -- 'admin' heç vaxt qeydiyyat metadata-sından gəlmir; yalnız customer | realtor
  v_role := case when new.raw_user_meta_data->>'role' = 'realtor' then 'realtor' else 'customer' end;
  insert into public.profiles (id, email, full_name, phone, role, agency_name, commission_rate, legal_status,
                               is_approved_realtor, is_approved, approval_status, status)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'fullName', split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data->>'phone', ''),
    v_role,
    coalesce(new.raw_user_meta_data->>'agency_name', new.raw_user_meta_data->>'agencyName'),
    nullif(coalesce(new.raw_user_meta_data->>'commission_rate', new.raw_user_meta_data->>'commissionRate', ''), '')::numeric,
    coalesce(new.raw_user_meta_data->>'legal_status', new.raw_user_meta_data->>'legalStatus'),
    false, v_role <> 'realtor',
    case when v_role = 'realtor' then 'pending' else 'approved' end,
    case when v_role = 'realtor' then 'pending' else 'approved' end
  )
  on conflict (id) do update set email = excluded.email, updated_at = now();
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------- 2. profiles: çatışmayan sütunlar + saxta default-lar ----------
alter table public.profiles add column if not exists tiktok_url text;
alter table public.profiles add column if not exists custom_contacts jsonb not null default '[]'::jsonb;
alter table public.profiles add column if not exists youtube_url text;

alter table public.profiles
  alter column rating drop default,
  alter column sales_speed_days drop default,
  alter column monthly_rank drop default,
  alter column monthly_score drop default,
  alter column service_areas drop default,
  alter column specialties drop default,
  alter column commission_rate drop default;

-- Real olmayan (default ilə yaranmış) dəyərləri təmizlə
update public.profiles set rating = null where coalesce(rating_count, 0) = 0;
update public.profiles set sales_speed_days = null, monthly_rank = null, monthly_score = null;
update public.profiles set service_areas = null where service_areas = array['Yasamal','Nəsimi']::text[];
update public.profiles set specialties  = null where specialties  = array['Yeni Tikili','Mənzil']::text[];

-- ---------- 3. listings ----------
alter table public.listings
  alter column latitude drop default,
  alter column longitude drop default,
  alter column rating drop default,
  alter column city drop default,
  alter column selected_city drop default;

alter table public.listings add column if not exists owner_kind text;          -- owner | realtor | other
alter table public.listings add column if not exists client_request_id uuid;   -- ikiqat göndərmədən qorunma
alter table public.listings add column if not exists sold_at timestamptz;
alter table public.listings add column if not exists sold_verified boolean not null default false;

alter table public.listings drop constraint if exists listings_owner_kind_check;
alter table public.listings add constraint listings_owner_kind_check
  check (owner_kind is null or owner_kind in ('owner','realtor','other'));

-- əməliyyat növlərini standartlaşdır: sale | rent | daily_rent | other
update public.listings set transaction_type = 'rent'       where transaction_type = 'long_term_rent';
update public.listings set transaction_type = 'daily_rent' where transaction_type = 'daily';
alter table public.listings drop constraint if exists listings_transaction_type_check;
alter table public.listings add constraint listings_transaction_type_check
  check (transaction_type in ('sale','rent','daily_rent','other'));

create unique index if not exists uq_listings_owner_request
  on public.listings(owner_id, client_request_id) where client_request_id is not null;
create unique index if not exists uq_listing_media_url on public.listing_photos(listing_id, url);
create index if not exists idx_listing_photos_listing on public.listing_photos(listing_id, sort_order);

-- ---------- 4. site_settings + admin audit ----------
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
insert into public.site_settings(key, value) values
  ('vip',             '{"enabled": false}'::jsonb),
  ('ranking_weights', '{"sale": 40, "rating": 2, "active": 1, "speed": 1, "review_cap": 10}'::jsonb),
  ('ranking_rules',   '{"require_sold_verification": false}'::jsonb)
on conflict (key) do nothing;

create table if not exists public.admin_audit_log (
  id bigint primary key generated by default as identity,
  admin_id uuid,
  action text not null,
  entity text,
  entity_id text,
  meta jsonb,
  created_at timestamptz not null default now()
);

-- ---------- 5. Elan yaratma (atomik + idempotent) ----------
create or replace function public.create_listing(p_request_id uuid, p_listing jsonb, p_media jsonb)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_id uuid; v_phone text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_request_id is null then raise exception 'request_id_required'; end if;

  select id into v_id from public.listings where owner_id = v_uid and client_request_id = p_request_id;
  if v_id is not null then return v_id; end if;                       -- ikinci klik → eyni elan

  v_phone := nullif(trim(p_listing->>'phone_number'), '');
  if v_phone is null then raise exception 'phone_required'; end if;
  if jsonb_array_length(coalesce(p_media, '[]'::jsonb)) = 0 then raise exception 'media_required'; end if;
  if (p_listing->>'owner_kind') is null or (p_listing->>'owner_kind') not in ('owner','realtor','other') then
    raise exception 'owner_kind_required';
  end if;

  begin
    insert into public.listings (
      owner_id, user_id, client_request_id, title, title_az, description, description_az,
      transaction_type, category_id, district_id, city, selected_city, address, latitude, longitude,
      price, currency, area_m2, room_count, floor, floor_total, yard_sot, phone_number, documents,
      owner_kind, status
    ) values (
      v_uid, v_uid, p_request_id, p_listing->>'title', p_listing->>'title',
      p_listing->>'description', p_listing->>'description',
      coalesce(nullif(p_listing->>'transaction_type',''), 'sale'),
      nullif(p_listing->>'category_id','')::bigint, nullif(p_listing->>'district_id','')::bigint,
      p_listing->>'city', p_listing->>'city', p_listing->>'address',
      nullif(p_listing->>'latitude','')::double precision, nullif(p_listing->>'longitude','')::double precision,
      (p_listing->>'price')::numeric, coalesce(nullif(p_listing->>'currency',''), 'AZN'),
      nullif(p_listing->>'area_m2','')::numeric, nullif(p_listing->>'room_count','')::int,
      nullif(p_listing->>'floor','')::int, nullif(p_listing->>'floor_total','')::int,
      nullif(p_listing->>'yard_sot','')::numeric, v_phone,
      case when jsonb_typeof(p_listing->'documents') = 'array'
           then array(select jsonb_array_elements_text(p_listing->'documents')) end,
      p_listing->>'owner_kind', 'active'
    ) returning id into v_id;
  exception when unique_violation then
    select id into v_id from public.listings where owner_id = v_uid and client_request_id = p_request_id;
    return v_id;
  end;

  insert into public.listing_photos (listing_id, url, media_type, sort_order)
  select v_id, m->>'url', coalesce(nullif(m->>'type',''), 'image'), (ord - 1)::int
  from jsonb_array_elements(p_media) with ordinality as t(m, ord)
  on conflict (listing_id, url) do nothing;

  update public.listings l set
    cover_image = (select url from public.listing_photos where listing_id = v_id and media_type = 'image' order by sort_order limit 1),
    image_url   = (select url from public.listing_photos where listing_id = v_id and media_type = 'image' order by sort_order limit 1),
    video_url   = (select url from public.listing_photos where listing_id = v_id and media_type = 'video' order by sort_order limit 1)
  where l.id = v_id;

  return v_id;
end $$;

create or replace function public.replace_listing_media(p_listing uuid, p_media jsonb)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.listings where id = p_listing and owner_id = auth.uid()) then
    raise exception 'forbidden';
  end if;
  if jsonb_array_length(coalesce(p_media, '[]'::jsonb)) = 0 then raise exception 'media_required'; end if;
  delete from public.listing_photos where listing_id = p_listing;
  insert into public.listing_photos (listing_id, url, media_type, sort_order)
  select p_listing, m->>'url', coalesce(nullif(m->>'type',''), 'image'), (ord - 1)::int
  from jsonb_array_elements(p_media) with ordinality as t(m, ord)
  on conflict (listing_id, url) do nothing;
  update public.listings set
    cover_image = (select url from public.listing_photos where listing_id = p_listing and media_type = 'image' order by sort_order limit 1),
    image_url   = (select url from public.listing_photos where listing_id = p_listing and media_type = 'image' order by sort_order limit 1),
    video_url   = (select url from public.listing_photos where listing_id = p_listing and media_type = 'video' order by sort_order limit 1),
    updated_at = now()
  where id = p_listing;
end $$;

-- ---------- 6. Mesajlaşma: axtarış + söhbət ----------
create extension if not exists pg_trgm;
create index if not exists idx_profiles_name_trgm   on public.profiles using gin (lower(full_name) gin_trgm_ops);
create index if not exists idx_profiles_agency_trgm on public.profiles using gin (lower(agency_name) gin_trgm_ops);

-- Yalnız təhlükəsiz sütunlar qaytarır (email/telefon yox). 1 hərfdən işləyir, prefiks öndədir.
create or replace function public.search_users(p_query text, p_limit int default 15)
returns table (id uuid, full_name text, agency_name text, avatar_url text, role text)
language sql stable security definer set search_path = public as $$
  with q as (select regexp_replace(lower(trim(coalesce(p_query, ''))), '([\\%_])', '\\\1', 'g') as s)
  select p.id, p.full_name, p.agency_name, p.avatar_url, p.role
  from public.profiles p, q
  where q.s <> ''
    and p.id is distinct from auth.uid()
    and (p.role <> 'realtor' or coalesce(p.status, 'approved') = 'approved')
    and coalesce(p.status, 'approved') <> 'rejected'
    and (   lower(p.full_name)   like q.s || '%' or lower(p.full_name)   like '% ' || q.s || '%'
         or lower(p.agency_name) like q.s || '%' or lower(p.agency_name) like '% ' || q.s || '%')
  order by (lower(p.full_name) like q.s || '%') desc,
           (lower(p.agency_name) like q.s || '%') desc,
           p.full_name
  limit least(greatest(p_limit, 1), 30);
$$;

create or replace function public.get_or_create_conversation(p_other uuid, p_listing uuid default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_id uuid;
begin
  if v_me is null then raise exception 'not_authenticated'; end if;
  if p_other = v_me then raise exception 'self_chat'; end if;
  select id into v_id from public.conversations
   where participant_ids @> array[v_me::text, p_other::text] and array_length(participant_ids, 1) = 2
   order by created_at limit 1;
  if v_id is null then
    insert into public.conversations(participant_ids, listing_id)
    values (array[v_me::text, p_other::text], p_listing) returning id into v_id;
  end if;
  return v_id;
end $$;

create or replace function public.on_message_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.conversations
     set last_message = left(coalesce(new.content, new.text, ''), 200),
         last_message_at = new.created_at, updated_at = now()
   where id = new.conversation_id;
  return new;
end $$;
drop trigger if exists trg_message_insert on public.messages;
create trigger trg_message_insert after insert on public.messages
  for each row execute function public.on_message_insert();

-- ---------- 7. Rieltor aylıq reytinq (YALNIZ real data) ----------
alter table public.realtor_monthly_stats add column if not exists is_final boolean not null default false;
alter table public.realtor_monthly_stats
  alter column sales_speed_days drop default,
  alter column avg_rating drop default,
  alter column monthly_rank drop default;

-- köhnə (arqumentsiz) versiya yeni funksiya ilə toqquşur — silirik
drop function if exists public.recompute_realtor_rankings();

create or replace function public.recompute_realtor_rankings(p_period date default date_trunc('month', now())::date)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_start timestamptz := p_period::timestamptz;
  v_end   timestamptz := (p_period + interval '1 month')::timestamptz;
  w jsonb := coalesce((select value from public.site_settings where key = 'ranking_weights'), '{}'::jsonb);
  rules jsonb := coalesce((select value from public.site_settings where key = 'ranking_rules'), '{}'::jsonb);
  w_sale numeric := coalesce((w->>'sale')::numeric, 40);
  w_rating numeric := coalesce((w->>'rating')::numeric, 2);
  w_active numeric := coalesce((w->>'active')::numeric, 1);
  w_speed numeric := coalesce((w->>'speed')::numeric, 1);
  v_cap int := coalesce((w->>'review_cap')::int, 10);
  v_need_verify boolean := coalesce((rules->>'require_sold_verification')::boolean, false);
  v_n int;
begin
  insert into public.realtor_monthly_stats
    (realtor_id, period, sales_count, sales_speed_days, active_listings, reviews_count, avg_rating, score, updated_at)
  select p.id, p_period,
         coalesce(s.sales, 0), s.avg_days::int, coalesce(a.active, 0), coalesce(r.cnt, 0), r.avg_rating,
         round( coalesce(s.sales, 0) * w_sale
              + coalesce(r.avg_rating, 0) * least(coalesce(r.total_cnt, 0), v_cap) * w_rating
              + least(coalesce(a.active, 0), 20) * w_active
              + case when coalesce(s.sales, 0) > 0 then greatest(0, 30 - coalesce(s.avg_days, 30)) * w_speed else 0 end
              , 2),
         now()
  from public.profiles p
  left join lateral (
    select count(*) as sales, avg(extract(epoch from (l.sold_at - l.created_at)) / 86400.0) as avg_days
    from public.listings l
    where l.owner_id = p.id and l.status = 'sold' and l.sold_at >= v_start and l.sold_at < v_end
      and (not v_need_verify or l.sold_verified)
  ) s on true
  left join lateral (
    select count(*) as active from public.listings l where l.owner_id = p.id and l.status = 'active'
  ) a on true
  left join lateral (
    select count(*) filter (where rv.created_at >= v_start and rv.created_at < v_end) as cnt,
           count(*) as total_cnt, round(avg(rv.rating)::numeric, 2) as avg_rating
    from public.realtor_reviews rv where rv.realtor_id = p.id and not coalesce(rv.is_hidden, false)
  ) r on true
  where p.role = 'realtor' and coalesce(p.status, 'approved') = 'approved'
  on conflict (realtor_id, period) do update set
    sales_count = excluded.sales_count, sales_speed_days = excluded.sales_speed_days,
    active_listings = excluded.active_listings, reviews_count = excluded.reviews_count,
    avg_rating = excluded.avg_rating, score = excluded.score, updated_at = now()
  where public.realtor_monthly_stats.is_final = false;           -- bağlanmış ay dəyişmir

  with ranked as (
    select id, case when score > 0
                    then rank() over (order by score desc, sales_count desc, avg_rating desc nulls last) end as rk
    from public.realtor_monthly_stats where period = p_period and is_final = false
  )
  update public.realtor_monthly_stats s set monthly_rank = ranked.rk from ranked where s.id = ranked.id;

  -- cari ay üçün profil sütunlarını sinxronlaşdır
  if p_period = date_trunc('month', now())::date then
    update public.profiles p set
      monthly_rank = s.monthly_rank, monthly_score = s.score, sales_count = s.sales_count,
      sales_speed_days = s.sales_speed_days, rating = s.avg_rating,
      rating_count = (select count(*) from public.realtor_reviews rv where rv.realtor_id = p.id and not coalesce(rv.is_hidden,false))
    from public.realtor_monthly_stats s
    where s.realtor_id = p.id and s.period = p_period;
  end if;

  get diagnostics v_n = row_count;
  return v_n;
end $$;

create or replace function public.finalize_realtor_month(p_period date)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.recompute_realtor_rankings(p_period);
  update public.realtor_monthly_stats set is_final = true where period = p_period;
end $$;

-- ---------- 8. Təhlükəsizlik: RLS yenidən (S3) ----------
do $$ declare r record; begin
  for r in select schemaname, tablename, policyname from pg_policies
           where schemaname = 'public'
             and tablename in ('profiles','listings','listing_photos','messages','conversations','favorites','site_settings','admin_audit_log','realtor_reviews')
  loop execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename); end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.listing_photos enable row level security;
alter table public.messages enable row level security;
alter table public.conversations enable row level security;
alter table public.favorites enable row level security;
alter table public.site_settings enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.realtor_reviews enable row level security;

-- profiles: cədvəl yalnız sahibinə açıqdır; başqaları `public_profiles` view-dan oxuyur
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, phone, avatar_url, agency_name, agency_address, commission_rate, legal_status,
              service_areas, specialties, facebook_url, instagram_url, tiktok_url, youtube_url, whatsapp,
              telegram_handle, custom_contacts, bio, email_notifications, sms_notifications)
  on public.profiles to authenticated;
create policy profiles_select_own on public.profiles for select to authenticated using (auth.uid() = id);
create policy profiles_update_own on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

create or replace view public.public_profiles as
select id, full_name, avatar_url, role, agency_name, commission_rate, legal_status, rating, rating_count,
       service_areas, specialties, sales_count, sales_speed_days, monthly_rank, monthly_score,
       facebook_url, instagram_url, tiktok_url, youtube_url, whatsapp, telegram_handle, custom_contacts, bio, created_at,
       case when role in ('realtor','admin') then phone end as phone
from public.profiles
where coalesce(status, 'approved') <> 'rejected'
  and (role <> 'realtor' or coalesce(status, 'approved') = 'approved');
grant select on public.public_profiles to anon, authenticated;

-- listings
revoke insert, update, delete on public.listings from anon, authenticated;
revoke insert, update, delete on public.listing_photos from anon, authenticated;
grant select on public.listings, public.listing_photos to anon, authenticated;
grant update (title, title_az, title_ru, title_en, description, description_az, description_ru, description_en,
              transaction_type, category_id, district_id, city, selected_city, address, latitude, longitude,
              price, currency, area_m2, room_count, floor, floor_total, yard_sot, phone_number, documents,
              owner_kind, status, sold_at, updated_at)
  on public.listings to authenticated;
grant delete on public.listings to authenticated;
create policy listings_select on public.listings for select
  using (status = 'active' or owner_id = auth.uid());
create policy listings_update_own on public.listings for update to authenticated
  using (owner_id = auth.uid() and status <> 'rejected')
  with check (owner_id = auth.uid() and status in ('active','pending','sold','archived'));
create policy listings_delete_own on public.listings for delete to authenticated using (owner_id = auth.uid());
create policy listing_photos_select on public.listing_photos for select
  using (exists (select 1 from public.listings l where l.id = listing_id and (l.status = 'active' or l.owner_id = auth.uid())));

-- favorites
create policy favorites_own on public.favorites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- conversations / messages (yalnız iştirakçılar)
revoke insert, update, delete on public.conversations from anon, authenticated;
grant select on public.conversations to authenticated;
create policy conv_select on public.conversations for select to authenticated
  using (auth.uid()::text = any(participant_ids));

revoke all on public.messages from anon, authenticated;
grant select, insert on public.messages to authenticated;
grant update (read) on public.messages to authenticated;
create policy msg_select on public.messages for select to authenticated
  using (sender_id = auth.uid()::text or receiver_id = auth.uid()::text);
create policy msg_insert on public.messages for insert to authenticated
  with check (sender_id = auth.uid()::text
              and exists (select 1 from public.conversations c
                          where c.id = conversation_id and auth.uid()::text = any(c.participant_ids)
                            and receiver_id = any(c.participant_ids)));
create policy msg_mark_read on public.messages for update to authenticated
  using (receiver_id = auth.uid()::text) with check (receiver_id = auth.uid()::text);

-- realtor_reviews
create unique index if not exists uq_realtor_review on public.realtor_reviews(realtor_id, reviewer_id) where reviewer_id is not null;
revoke all on public.realtor_reviews from anon, authenticated;
grant select on public.realtor_reviews to anon, authenticated;
grant insert (realtor_id, reviewer_id, reviewer_name, listing_id, rating, comment) on public.realtor_reviews to authenticated;
create policy rr_select on public.realtor_reviews for select using (not coalesce(is_hidden, false));
create policy rr_insert on public.realtor_reviews for insert to authenticated
  with check (reviewer_id = auth.uid() and realtor_id <> auth.uid());

-- site_settings: hamı oxuya bilər (gizli məlumat saxlamayın), yazmaq yalnız service_role ilə
grant select on public.site_settings to anon, authenticated;
create policy site_settings_read on public.site_settings for select using (true);

-- RPC icazələri
revoke all on function public.create_listing(uuid, jsonb, jsonb) from public;
revoke all on function public.replace_listing_media(uuid, jsonb) from public;
revoke all on function public.search_users(text, int) from public;
revoke all on function public.get_or_create_conversation(uuid, uuid) from public;
revoke all on function public.recompute_realtor_rankings(date) from public;
revoke all on function public.finalize_realtor_month(date) from public;
grant execute on function public.create_listing(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.replace_listing_media(uuid, jsonb) to authenticated;
grant execute on function public.search_users(text, int) to authenticated;
grant execute on function public.get_or_create_conversation(uuid, uuid) to authenticated;

-- ---------- 9. Storage: limitsiz bucket + yalnız öz qovluğuna yükləmə ----------
insert into storage.buckets (id, name, public, file_size_limit)
values ('listings', 'listings', true, null), ('avatars', 'avatars', true, null)
on conflict (id) do update set public = true, file_size_limit = null;

drop policy if exists "Public Access to Avatars" on storage.objects;
drop policy if exists "Allow Upload to Avatars" on storage.objects;
drop policy if exists "Allow Update in Avatars" on storage.objects;
drop policy if exists "Public Access to Listings" on storage.objects;
drop policy if exists "Allow Upload to Listings" on storage.objects;
drop policy if exists "Allow Update in Listings" on storage.objects;
drop policy if exists "Public Access to Documents" on storage.objects;
drop policy if exists "Allow Upload to Documents" on storage.objects;
drop policy if exists media_public_read on storage.objects;
drop policy if exists media_user_insert on storage.objects;
drop policy if exists media_user_update on storage.objects;
drop policy if exists media_user_delete on storage.objects;

create policy media_public_read on storage.objects for select using (bucket_id in ('listings','avatars'));
create policy media_user_insert on storage.objects for insert to authenticated
  with check (bucket_id in ('listings','avatars') and (storage.foldername(name))[1] = auth.uid()::text);
create policy media_user_update on storage.objects for update to authenticated
  using (bucket_id in ('listings','avatars') and (storage.foldername(name))[1] = auth.uid()::text);
create policy media_user_delete on storage.objects for delete to authenticated
  using (bucket_id in ('listings','avatars') and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- 10. Saxta demo hesabları sil (S2) ----------
delete from auth.users where email in ('admin@mulkera.az','realtor@mulkera.az','customer@mulkera.az');

-- ---------- 11. Realtime nəşrləri ----------
do $$ begin alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.listings;
exception when duplicate_object then null; end $$;
