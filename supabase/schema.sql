-- =====================================================================
-- MÜLKERA — Tam Supabase SQL Sxemi, Funksiyalar, Trigger-lər və RLS
-- Bu faylı Supabase Dashboard -> SQL Editor bölməsində icra edə bilərsiniz.
-- =====================================================================

create extension if not exists "uuid-ossp";

-- =====================================================================
-- 1. PROFİLLƏR (auth.users ilə 1-1 əlaqəli)
-- =====================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  phone text,
  avatar_url text,
  role text not null default 'customer' check (role in ('customer', 'realtor', 'admin')),
  status text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
  agency_name text,
  agency_address text,
  commission_rate numeric(5,2) default 1.5,
  legal_status text,
  license_number text,
  rating numeric(3,2) default 5.00,
  rating_count integer default 0,
  service_areas text[] default array['Yasamal', 'Nəsimi']::text[],
  specialties text[] default array['Yeni Tikili', 'Mənzil']::text[],
  sales_count integer default 0,
  sales_speed_days integer default 14,
  monthly_rank integer default 1,
  monthly_score numeric(10,2) default 100,
  award jsonb,
  is_approved_realtor boolean default false,
  is_approved boolean default true,
  approval_status text default 'approved',
  facebook_url text,
  instagram_url text,
  whatsapp text,
  telegram_handle text,
  email_notifications boolean default true,
  sms_notifications boolean default false,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Mümkün çatışmayan sütunların təhlükəsiz əlavə olunması:
alter table public.profiles add column if not exists agency_address text;
alter table public.profiles add column if not exists license_number text;
alter table public.profiles add column if not exists service_areas text[] default array['Yasamal', 'Nəsimi']::text[];
alter table public.profiles add column if not exists specialties text[] default array['Yeni Tikili', 'Mənzil']::text[];
alter table public.profiles add column if not exists sales_count integer default 0;
alter table public.profiles add column if not exists sales_speed_days integer default 14;
alter table public.profiles add column if not exists monthly_rank integer default 1;
alter table public.profiles add column if not exists monthly_score numeric(10,2) default 100;
alter table public.profiles add column if not exists award jsonb;
alter table public.profiles add column if not exists is_approved_realtor boolean default false;
alter table public.profiles add column if not exists is_approved boolean default true;
alter table public.profiles add column if not exists approval_status text default 'approved';
alter table public.profiles add column if not exists facebook_url text;
alter table public.profiles add column if not exists instagram_url text;
alter table public.profiles add column if not exists whatsapp text;
alter table public.profiles add column if not exists telegram_handle text;
alter table public.profiles add column if not exists email_notifications boolean default true;
alter table public.profiles add column if not exists sms_notifications boolean default false;
alter table public.profiles add column if not exists bio text;

-- Qeydiyyatdan keçən hər auth.users üçün profil yaradılması trigger-i
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    phone,
    role,
    agency_name,
    commission_rate,
    legal_status,
    is_approved_realtor,
    is_approved,
    approval_status
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'fullName', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'phone', null),
    coalesce(new.raw_user_meta_data->>'role', 'customer'),
    coalesce(new.raw_user_meta_data->>'agency_name', new.raw_user_meta_data->>'agencyName', null),
    nullif(coalesce(new.raw_user_meta_data->>'commission_rate', new.raw_user_meta_data->>'commissionRate', ''), '')::numeric,
    coalesce(new.raw_user_meta_data->>'legal_status', new.raw_user_meta_data->>'legalStatus', null),
    case when coalesce(new.raw_user_meta_data->>'role', 'customer') = 'realtor' then false else true end,
    case when coalesce(new.raw_user_meta_data->>'role', 'customer') = 'realtor' then false else true end,
    case when coalesce(new.raw_user_meta_data->>'role', 'customer') = 'realtor' then 'pending' else 'approved' end
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =====================================================================
-- 2. KATEQORİYALAR VƏ RAYONLAR
-- =====================================================================
create table if not exists public.categories (
  id bigint generated always as identity primary key,
  name text not null,
  name_az text,
  name_ru text,
  name_en text,
  slug text unique
);

create table if not exists public.districts (
  id bigint generated always as identity primary key,
  city text not null default 'Bakı',
  name text not null,
  name_az text,
  name_ru text,
  name_en text,
  parent_id bigint references public.districts(id)
);

-- =====================================================================
-- 3. ELANLAR VƏ ƏLAKƏDAR CƏDVƏLLƏR (listings, listing_photos, favorites)
-- =====================================================================
create table if not exists public.listings (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references public.profiles(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  listing_number text,
  title text not null,
  title_az text,
  title_ru text,
  title_en text,
  description text,
  description_az text,
  description_ru text,
  description_en text,
  transaction_type text not null default 'sale' check (transaction_type in ('sale', 'rent', 'daily_rent', 'daily')),
  category_id bigint references public.categories(id),
  district_id bigint references public.districts(id),
  city text default 'Bakı',
  selected_city text default 'Bakı',
  address text,
  microdistrict text,
  settlement text,
  latitude double precision default 40.4093,
  longitude double precision default 49.8671,
  price numeric(14,2) not null default 0,
  currency text default 'AZN',
  area_m2 numeric(10,2),
  room_count integer,
  floor integer,
  floor_total integer,
  yard_sot numeric(10,2),
  phone_number text,
  documents text[],
  is_vip boolean default false,
  vip_until timestamptz,
  vip_package text,
  vip_started_at timestamptz,
  vip_expires_at timestamptz,
  boost_count integer default 0,
  status text not null default 'active' check (status in ('active', 'pending', 'sold', 'rejected', 'archived')),
  views_count integer default 0,
  view_count integer default 0,
  favorite_count integer default 0,
  cover_image text,
  image_url text,
  video_url text,
  rating numeric(3,2) default 5.00,
  reviews_count integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_listings_owner on public.listings(owner_id);
create index if not exists idx_listings_district on public.listings(district_id);
create index if not exists idx_listings_category on public.listings(category_id);
create index if not exists idx_listings_status on public.listings(status);
create index if not exists idx_listings_transaction on public.listings(transaction_type);

-- Elan baxış sayını təhlükəsiz artıran RPC funksiyası
create or replace function public.increment_listing_view(p_listing_id uuid)
returns void as $$
begin
  update public.listings
  set views_count = coalesce(views_count, 0) + 1,
      view_count = coalesce(view_count, 0) + 1,
      updated_at = now()
  where id = p_listing_id;
end;
$$ language plpgsql security definer;

create table if not exists public.listing_photos (
  id bigint generated always as identity primary key,
  listing_id uuid references public.listings(id) on delete cascade,
  url text not null,
  media_type text default 'image',
  sort_order integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.favorites (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, listing_id)
);

-- =====================================================================
-- 4. RƏYLƏR VƏ ŞİKAYƏT SİSTEMİ (reviews, realtor_reviews, reports)
-- =====================================================================
-- Elan Rəyləri
create table if not exists public.reviews (
  id bigint generated always as identity primary key,
  listing_id uuid references public.listings(id) on delete cascade,
  author_name text,
  user_id uuid references public.profiles(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  comment text not null,
  likes_count integer default 0,
  replies jsonb default '[]'::jsonb,
  is_reported boolean default false,
  report_reason text,
  created_at timestamptz default now()
);

-- Rieltor Rəyləri
create table if not exists public.realtor_reviews (
  id bigint generated always as identity primary key,
  realtor_id uuid references public.profiles(id) on delete cascade,
  reviewer_id uuid references public.profiles(id) on delete set null,
  reviewer_name text,
  listing_id uuid references public.listings(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  comment text not null,
  is_reported boolean default false,
  is_hidden boolean default false,
  report_count integer default 0,
  created_at timestamptz default now()
);

-- Elan Şikayətləri
create table if not exists public.reports (
  id bigint generated always as identity primary key,
  listing_id uuid references public.listings(id) on delete cascade,
  reporter_id uuid references public.profiles(id) on delete set null,
  reason text not null,
  details text,
  status text default 'pending',
  created_at timestamptz default now()
);

-- Rəy Şikayətləri
create table if not exists public.review_reports (
  id bigint generated always as identity primary key,
  review_id bigint references public.realtor_reviews(id) on delete cascade,
  realtor_id uuid references public.profiles(id) on delete cascade,
  reporter_id uuid references public.profiles(id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'pending' check (status in ('pending', 'resolved', 'dismissed')),
  admin_note text,
  created_at timestamptz default now(),
  resolved_at timestamptz
);

-- =====================================================================
-- 5. RİELTOR AYLIQ STATİSTİKASI VƏ AVTOMATİK REYTİNQ
-- =====================================================================
create table if not exists public.realtor_monthly_stats (
  id bigint generated always as identity primary key,
  realtor_id uuid references public.profiles(id) on delete cascade,
  period date not null default date_trunc('month', now())::date,
  monthly_views integer default 0,
  sales_count integer default 0,
  sales_speed_days integer default 14,
  active_listings integer default 0,
  reviews_count integer default 0,
  avg_rating numeric(3,2) default 5.0,
  score numeric(10,2) default 0,
  monthly_rank integer default 1,
  pk_wins integer default 0,
  pk_points integer default 0,
  updated_at timestamptz default now(),
  unique(realtor_id, period)
);

-- Rieltor reytinqlərinin avtomatik hesablanması funksiyası
create or replace function public.recompute_realtor_rankings()
returns void as $$
declare
  r record;
  calc_score numeric;
  curr_rank int := 1;
begin
  for r in (
    select
      p.id as realtor_id,
      coalesce(p.sales_count, (select count(*) from public.listings l where l.owner_id = p.id and l.status = 'sold'), 0) as s_count,
      coalesce(p.sales_speed_days, 14) as s_speed,
      (select count(*) from public.listings l where l.owner_id = p.id and l.status = 'active') as a_listings,
      (select count(*) from public.realtor_reviews rev where rev.realtor_id = p.id and rev.is_hidden = false) as rev_count,
      coalesce((select avg(rev.rating) from public.realtor_reviews rev where rev.realtor_id = p.id and rev.is_hidden = false), 5.0) as rev_avg
    from public.profiles p
    where p.role = 'realtor' or p.is_approved_realtor = true
  ) loop
    calc_score := (r.s_count * 30.0) + (r.rev_avg * 15.0) + (r.rev_count * 5.0) + (r.a_listings * 2.0) + greatest(0, 30 - r.s_speed);

    update public.profiles
    set rating = round(r.rev_avg, 2),
        rating_count = r.rev_count,
        updated_at = now()
    where id = r.realtor_id;

    insert into public.realtor_monthly_stats (
      realtor_id, period, active_listings, sales_count, sales_speed_days, reviews_count, avg_rating, score, updated_at
    )
    values (
      r.realtor_id, date_trunc('month', now())::date, r.a_listings, r.s_count, r.s_speed, r.rev_count, round(r.rev_avg, 2), calc_score, now()
    )
    on conflict (realtor_id, period) do update set
      active_listings = excluded.active_listings,
      sales_count = excluded.sales_count,
      sales_speed_days = excluded.sales_speed_days,
      reviews_count = excluded.reviews_count,
      avg_rating = excluded.avg_rating,
      score = excluded.score,
      updated_at = now();
  end loop;

  for r in (
    select id, realtor_id from public.realtor_monthly_stats
    where period = date_trunc('month', now())::date
    order by score desc
  ) loop
    update public.realtor_monthly_stats set monthly_rank = curr_rank where id = r.id;
    update public.profiles set monthly_rank = curr_rank where id = r.realtor_id;
    curr_rank := curr_rank + 1;
  end loop;
end;
$$ language plpgsql security definer;

-- =====================================================================
-- 6. MESAJLAŞMA VƏ ÇAT (conversations & messages)
-- =====================================================================
create table if not exists public.conversations (
  id uuid primary key default uuid_generate_v4(),
  participant_ids text[] not null,
  listing_id uuid references public.listings(id) on delete set null,
  last_message text,
  last_message_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  sender_id text not null,
  receiver_id text not null,
  sender_name text,
  listing_id uuid references public.listings(id) on delete set null,
  content text,
  text text,
  read boolean default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_sender on public.messages(sender_id);
create index if not exists idx_messages_receiver on public.messages(receiver_id);
create index if not exists idx_messages_conversation on public.messages(conversation_id);

-- =====================================================================
-- 7. CANLI YAYIM VƏ PK ARENA (live_streams, pk_matches, live_gifts, live_comments)
-- =====================================================================
create table if not exists public.live_streams (
  id uuid primary key default uuid_generate_v4(),
  room_name text not null,
  host_id uuid references public.profiles(id) on delete cascade,
  rival_id uuid references public.profiles(id) on delete set null,
  title text not null,
  description text,
  is_pk boolean default false,
  left_listing_id uuid references public.listings(id) on delete set null,
  right_listing_id uuid references public.listings(id) on delete set null,
  left_score integer default 0,
  right_score integer default 0,
  status text default 'active',
  viewers_count integer default 1,
  time_left_seconds integer default 900,
  created_at timestamptz default now(),
  ended_at timestamptz
);

create table if not exists public.pk_matches (
  id uuid primary key default uuid_generate_v4(),
  stream_id uuid references public.live_streams(id) on delete cascade,
  left_realtor_id uuid references public.profiles(id) on delete cascade,
  right_realtor_id uuid references public.profiles(id) on delete set null,
  left_score integer default 0,
  right_score integer default 0,
  winner_side text default 'draw',
  status text default 'active',
  created_at timestamptz default now(),
  finished_at timestamptz
);

create table if not exists public.live_gifts (
  id bigint generated always as identity primary key,
  stream_id uuid references public.live_streams(id) on delete cascade,
  pk_match_id uuid references public.pk_matches(id) on delete set null,
  sender_id uuid references public.profiles(id) on delete set null,
  sender_name text,
  gift_id text,
  gift_name text,
  gift_icon text,
  price numeric(10,2) default 0,
  points integer default 10,
  target_side text default 'left',
  created_at timestamptz default now()
);

create table if not exists public.live_comments (
  id bigint generated always as identity primary key,
  stream_id uuid references public.live_streams(id) on delete cascade,
  sender_id text,
  sender_name text,
  content text,
  text text,
  created_at timestamptz default now()
);

create table if not exists public.live_waiting_list (
  id uuid primary key default uuid_generate_v4(),
  email text,
  phone text,
  role text default 'viewer',
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Hədiyyə göndərildikdə PK xalını avtomatik artıran Trigger Funksiyası
create or replace function public.handle_live_gift_insert()
returns trigger as $$
begin
  if new.target_side = 'left' then
    update public.live_streams
    set left_score = coalesce(left_score, 0) + coalesce(new.points, 10)
    where id = new.stream_id;

    if new.pk_match_id is not null then
      update public.pk_matches
      set left_score = coalesce(left_score, 0) + coalesce(new.points, 10)
      where id = new.pk_match_id;
    end if;
  else
    update public.live_streams
    set right_score = coalesce(right_score, 0) + coalesce(new.points, 10)
    where id = new.stream_id;

    if new.pk_match_id is not null then
      update public.pk_matches
      set right_score = coalesce(right_score, 0) + coalesce(new.points, 10)
      where id = new.pk_match_id;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_live_gift_inserted on public.live_gifts;
create trigger on_live_gift_inserted
  after insert on public.live_gifts
  for each row execute procedure public.handle_live_gift_insert();

-- =====================================================================
-- 8. ÖDƏNİŞLƏR VƏ VIP XİDMƏTLƏR (vip_promotions & payments)
-- =====================================================================
create table if not exists public.vip_promotions (
  id text primary key,
  listing_id uuid references public.listings(id) on delete cascade,
  listing_title text,
  package_id text,
  package_name text,
  amount numeric(10,2),
  currency text default 'AZN',
  payment_method text,
  cardholder_name text,
  status text default 'succeeded',
  auth_code text,
  created_at timestamptz default now(),
  expires_at timestamptz
);

-- =====================================================================
-- 9. RLS (Row Level Security) SİYASƏTLƏRİ
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.districts enable row level security;
alter table public.listings enable row level security;
alter table public.listing_photos enable row level security;
alter table public.favorites enable row level security;
alter table public.reviews enable row level security;
alter table public.realtor_reviews enable row level security;
alter table public.reports enable row level security;
alter table public.review_reports enable row level security;
alter table public.realtor_monthly_stats enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.live_streams enable row level security;
alter table public.pk_matches enable row level security;
alter table public.live_gifts enable row level security;
alter table public.live_comments enable row level security;
alter table public.live_waiting_list enable row level security;
alter table public.vip_promotions enable row level security;

-- İcazə Siyasətləri (Public Read / Permissive Check)
create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_insert_all" on public.profiles for insert with check (true);
create policy "profiles_update_all" on public.profiles for update using (true);

create policy "categories_select_all" on public.categories for select using (true);
create policy "districts_select_all" on public.districts for select using (true);

create policy "listings_select_all" on public.listings for select using (true);
create policy "listings_insert_all" on public.listings for insert with check (true);
create policy "listings_update_all" on public.listings for update using (true);
create policy "listings_delete_all" on public.listings for delete using (true);

create policy "listing_photos_select_all" on public.listing_photos for select using (true);
create policy "listing_photos_insert_all" on public.listing_photos for insert with check (true);
create policy "listing_photos_update_all" on public.listing_photos for update using (true);
create policy "listing_photos_delete_all" on public.listing_photos for delete using (true);

create policy "favorites_all" on public.favorites for all using (true);
create policy "reviews_all" on public.reviews for all using (true);
create policy "realtor_reviews_all" on public.realtor_reviews for all using (true);
create policy "reports_all" on public.reports for all using (true);
create policy "review_reports_all" on public.review_reports for all using (true);
create policy "realtor_monthly_stats_all" on public.realtor_monthly_stats for all using (true);

create policy "conversations_all" on public.conversations for all using (true);
create policy "messages_all" on public.messages for all using (true);

create policy "live_streams_all" on public.live_streams for all using (true);
create policy "pk_matches_all" on public.pk_matches for all using (true);
create policy "live_gifts_all" on public.live_gifts for all using (true);
create policy "live_comments_all" on public.live_comments for all using (true);
create policy "live_waiting_list_all" on public.live_waiting_list for all using (true);
create policy "vip_promotions_all" on public.vip_promotions for all using (true);

-- =====================================================================
-- 10. STORAGE BUCKET-LAR (avatars, listings, documents)
-- =====================================================================
insert into storage.buckets (id, name, public) 
values 
  ('avatars', 'avatars', true),
  ('listings', 'listings', true),
  ('documents', 'documents', true)
on conflict (id) do update set public = true;

-- Storage oxuma və yükləmə icazələri
drop policy if exists "Public Access to Avatars" on storage.objects;
drop policy if exists "Allow Upload to Avatars" on storage.objects;
drop policy if exists "Allow Update in Avatars" on storage.objects;

create policy "Public Access to Avatars" on storage.objects for select using (bucket_id = 'avatars');
create policy "Allow Upload to Avatars" on storage.objects for insert with check (bucket_id = 'avatars');
create policy "Allow Update in Avatars" on storage.objects for update using (bucket_id = 'avatars');

drop policy if exists "Public Access to Listings" on storage.objects;
drop policy if exists "Allow Upload to Listings" on storage.objects;
drop policy if exists "Allow Update in Listings" on storage.objects;

create policy "Public Access to Listings" on storage.objects for select using (bucket_id = 'listings');
create policy "Allow Upload to Listings" on storage.objects for insert with check (bucket_id = 'listings');
create policy "Allow Update in Listings" on storage.objects for update using (bucket_id = 'listings');

drop policy if exists "Public Access to Documents" on storage.objects;
drop policy if exists "Allow Upload to Documents" on storage.objects;

create policy "Public Access to Documents" on storage.objects for select using (bucket_id = 'documents');
create policy "Allow Upload to Documents" on storage.objects for insert with check (bucket_id = 'documents');

-- =====================================================================
-- 11. SUPABASE REALTIME ABUNƏLİYİ (Publication)
-- =====================================================================
do $$
begin
  alter publication supabase_realtime add table public.live_streams;
  alter publication supabase_realtime add table public.pk_matches;
  alter publication supabase_realtime add table public.live_gifts;
  alter publication supabase_realtime add table public.live_comments;
  alter publication supabase_realtime add table public.messages;
  alter publication supabase_realtime add table public.listings;
exception
  when others then null;
end $$;

-- =====================================================================
-- 12. İLKİN STANDART MƏLUMATLAR (SEED DATA)
-- =====================================================================
insert into public.categories (id, name, name_az, name_ru, name_en, slug)
values
  (1, 'Yeni Tikili', 'Yeni Tikili', 'Новостройка', 'New Construction', 'yeni-tikili'),
  (2, 'Köhnə Tikili', 'Köhnə Tikili', 'Вторичка', 'Secondary Market', 'kohne-tikili'),
  (3, 'Həyət Evi / Villa', 'Həyət Evi / Villa', 'Дом / Вилла', 'House / Villa', 'heyet-evi'),
  (4, 'Bağ Evi', 'Bağ Evi', 'Дача', 'Country House', 'bag-evi'),
  (5, 'Ofis', 'Ofis', 'Офис', 'Office', 'ofis'),
  (6, 'Qaraj / Obyekt', 'Qaraj / Obyekt', 'Гараж / Объект', 'Commercial / Garage', 'obyekt'),
  (7, 'Torpaq Sahəsi', 'Torpaq Sahəsi', 'Земельный участок', 'Land Plot', 'torpaq')
on conflict (id) do nothing;

insert into public.districts (id, city, name, name_az, name_ru, name_en)
values
  (1, 'Bakı', 'Nəsimi', 'Nəsimi', 'Насими', 'Nasimi'),
  (2, 'Bakı', 'Nərimanov', 'Nərimanov', 'Нариманов', 'Narimanov'),
  (3, 'Bakı', 'Yasamal', 'Yasamal', 'Яsamaл', 'Yasamal'),
  (4, 'Bakı', 'Səbail', 'Səbail', 'Сабаил', 'Sabail'),
  (5, 'Bakı', 'Xətai', 'Xətai', 'Хатаи', 'Khatai'),
  (6, 'Bakı', 'Binəqədi', 'Binəqədi', 'Бинагади', 'Binagadi'),
  (7, 'Bakı', 'Sabunçu', 'Sabunçu', 'Сабунчи', 'Sabunchu'),
  (8, 'Bakı', 'Suraxanı', 'Suraxanı', 'Сураханы', 'Surakhani'),
  (9, 'Bakı', 'Xəzar', 'Xəzər', 'Хазар', 'Khazar'),
  (10, 'Bakı', 'Qaradağ', 'Qaradağ', 'Гарадаг', 'Garadagh'),
  (11, 'Sumqayıt', 'Sumqayıt mərkəz', 'Sumqayıt mərkəz', 'Центр Сумгаита', 'Sumgait Center'),
  (12, 'Abşeron', 'Xırdalan', 'Xırdalan', 'Хырдалан', 'Khirdalan'),
  (13, 'Abşeron', 'Masazır', 'Masazır', 'Масазыр', 'Masazir'),
  (14, 'Gəncə', 'Gəncə', 'Gəncə', 'Гянджа', 'Ganja'),
  (15, 'Şuşa', 'Şuşa', 'Şuşa', 'Шуша', 'Shusha')
on conflict (id) do nothing;
