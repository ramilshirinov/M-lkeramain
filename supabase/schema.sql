-- =====================================================================
-- MÜLKERA — Supabase Schema
-- Əmlak elanları + Canlı Yayım (LiveKit) + PK Arena sistemi
-- Bu faylı Supabase Dashboard → SQL Editor-da açıb bütünlüklə çalışdırın.
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
  commission_rate numeric(5,2),
  legal_status text,
  rating numeric(3,2) default 0,
  rating_count integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Qeydiyyatdan keçən hər auth.users sətri üçün avtomatik profil yaradılması
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, phone, role, agency_name, commission_rate, legal_status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'phone',
    coalesce(new.raw_user_meta_data->>'role', 'customer'),
    new.raw_user_meta_data->>'agency_name',
    nullif(new.raw_user_meta_data->>'commission_rate', '')::numeric,
    new.raw_user_meta_data->>'legal_status'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =====================================================================
-- 2. KATEQORİYA / RAYON
-- =====================================================================
create table if not exists public.categories (
  id bigint generated always as identity primary key,
  name text not null,
  slug text unique
);

create table if not exists public.districts (
  id bigint generated always as identity primary key,
  city text not null default 'Bakı',
  name text not null,
  parent_id bigint references public.districts(id)
);

-- =====================================================================
-- 3. ELANLAR (listings)
-- =====================================================================
create table if not exists public.listings (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  transaction_type text not null default 'sale' check (transaction_type in ('sale', 'rent', 'daily_rent')),
  category_id bigint references public.categories(id),
  district_id bigint references public.districts(id),
  city text default 'Bakı',
  address text,
  microdistrict text,
  settlement text,
  latitude double precision,
  longitude double precision,
  price numeric(14,2) not null default 0,
  currency text default 'AZN',
  area_m2 numeric(10,2),
  room_count integer,
  floor integer,
  floor_total integer,
  is_vip boolean default false,
  vip_until timestamptz,
  status text not null default 'active' check (status in ('active', 'pending', 'sold', 'rejected', 'archived')),
  views_count integer default 0,
  video_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_listings_owner on public.listings(owner_id);
create index if not exists idx_listings_district on public.listings(district_id);
create index if not exists idx_listings_category on public.listings(category_id);
create index if not exists idx_listings_status on public.listings(status);

create table if not exists public.listing_photos (
  id bigint generated always as identity primary key,
  listing_id uuid references public.listings(id) on delete cascade,
  url text not null,
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

create table if not exists public.listing_views (
  id bigint generated always as identity primary key,
  listing_id uuid references public.listings(id) on delete cascade,
  viewer_id uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table if not exists public.reports (
  id bigint generated always as identity primary key,
  listing_id uuid references public.listings(id) on delete cascade,
  reporter_id uuid references public.profiles(id),
  reason text,
  details text,
  status text default 'open' check (status in ('open', 'dismissed')),
  created_at timestamptz default now()
);

create table if not exists public.realtor_reviews (
  id bigint generated always as identity primary key,
  realtor_id uuid references public.profiles(id) on delete cascade,
  reviewer_id uuid references public.profiles(id),
  reviewer_name text,
  listing_id uuid references public.listings(id),
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now()
);

-- =====================================================================
-- 4. RİELTOR REYTİNQİ (aylıq statistika)
-- =====================================================================
create table if not exists public.realtor_monthly_stats (
  id bigint generated always as identity primary key,
  realtor_id uuid references public.profiles(id) on delete cascade,
  period date not null default date_trunc('month', now()),
  monthly_views integer default 0,
  active_listings integer default 0,
  reviews_count integer default 0,
  avg_rating numeric(3,2) default 0,
  pk_wins integer default 0,
  pk_points integer default 0,
  score numeric(10,2) default 0,
  updated_at timestamptz default now(),
  unique(realtor_id, period)
);

create index if not exists idx_realtor_stats_score on public.realtor_monthly_stats(score desc);

-- =====================================================================
-- 5. CANLI YAYIM (LiveKit otaqları)
-- =====================================================================
create table if not exists public.live_streams (
  id uuid primary key default uuid_generate_v4(),
  room_name text not null unique,
  host_id uuid references public.profiles(id),
  rival_id uuid references public.profiles(id),
  title text not null,
  description text,
  listing_id uuid references public.listings(id),
  left_listing_id uuid references public.listings(id),
  right_listing_id uuid references public.listings(id),
  is_pk boolean default false,
  status text not null default 'active' check (status in ('scheduled', 'active', 'ended')),
  viewers_count integer default 0,
  left_score integer default 0,
  right_score integer default 0,
  thumbnail_url text,
  started_at timestamptz default now(),
  ended_at timestamptz
);

create index if not exists idx_live_streams_status on public.live_streams(status);

-- PK Arena matçları — iki rieltor arasında xal / qalib tarixçəsi
create table if not exists public.pk_matches (
  id uuid primary key default uuid_generate_v4(),
  stream_id uuid references public.live_streams(id) on delete cascade,
  left_realtor_id uuid references public.profiles(id),
  right_realtor_id uuid references public.profiles(id),
  left_score integer default 0,
  right_score integer default 0,
  winner_side text check (winner_side in ('left', 'right', 'draw')),
  status text not null default 'active' check (status in ('active', 'finished')),
  started_at timestamptz default now(),
  finished_at timestamptz
);

-- Canlı yayımda göndərilən hədiyyələr (hər hədiyyə eyni zamanda PK xalına əlavə olunur)
create table if not exists public.live_gifts (
  id bigint generated always as identity primary key,
  stream_id uuid references public.live_streams(id) on delete cascade,
  pk_match_id uuid references public.pk_matches(id) on delete set null,
  sender_id uuid references public.profiles(id),
  sender_name text default 'Qonaq',
  gift_id text not null,
  gift_name text,
  gift_icon text,
  price numeric(10,2) default 0,
  points integer default 0,
  target_side text default 'left' check (target_side in ('left', 'right')),
  created_at timestamptz default now()
);

create index if not exists idx_live_gifts_stream on public.live_gifts(stream_id);

create table if not exists public.live_comments (
  id bigint generated always as identity primary key,
  stream_id uuid references public.live_streams(id) on delete cascade,
  sender_id uuid references public.profiles(id),
  sender_name text default 'Qonaq',
  text text not null,
  created_at timestamptz default now()
);

create index if not exists idx_live_comments_stream on public.live_comments(stream_id);

create table if not exists public.live_participants (
  id bigint generated always as identity primary key,
  stream_id uuid references public.live_streams(id) on delete cascade,
  participant_id uuid references public.profiles(id),
  participant_name text,
  role text default 'viewer' check (role in ('host', 'rival', 'viewer')),
  joined_at timestamptz default now(),
  left_at timestamptz
);

-- =====================================================================
-- 5.1 MESAJLAŞMA VƏ ÇAT (Conversations & Messages)
-- =====================================================================
create table if not exists public.conversations (
  id text primary key,
  participant_ids text[] not null,
  listing_id uuid references public.listings(id) on delete set null,
  last_message text,
  last_message_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id text primary key,
  conversation_id text references public.conversations(id) on delete cascade,
  sender_id text not null,
  sender_name text,
  receiver_id text not null,
  listing_id uuid references public.listings(id) on delete set null,
  text text not null,
  read boolean default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_conversation on public.messages(conversation_id);
create index if not exists idx_messages_receiver on public.messages(receiver_id);

create table if not exists public.live_waiting_list (
  id text primary key,
  email text,
  phone text,
  role text default 'viewer',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now()
);

-- Hədiyyə göndəriləndə: PK xalını avtomatik artır + rieltor aylıq xalını yeniləyir
create or replace function public.apply_live_gift()
returns trigger as $$
begin
  if new.target_side = 'left' then
    update public.live_streams set left_score = left_score + new.points where id = new.stream_id;
    if new.pk_match_id is not null then
      update public.pk_matches set left_score = left_score + new.points where id = new.pk_match_id;
    end if;
  else
    update public.live_streams set right_score = right_score + new.points where id = new.stream_id;
    if new.pk_match_id is not null then
      update public.pk_matches set right_score = right_score + new.points where id = new.pk_match_id;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_live_gift_insert on public.live_gifts;
create trigger on_live_gift_insert
  after insert on public.live_gifts
  for each row execute procedure public.apply_live_gift();

-- =====================================================================
-- 6. REALTIME
-- =====================================================================
alter publication supabase_realtime add table public.live_streams;
alter publication supabase_realtime add table public.live_gifts;
alter publication supabase_realtime add table public.live_comments;
alter publication supabase_realtime add table public.pk_matches;

-- =====================================================================
-- 7. RLS (Row Level Security)
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.listing_photos enable row level security;
alter table public.favorites enable row level security;
alter table public.reports enable row level security;
alter table public.realtor_reviews enable row level security;
alter table public.realtor_monthly_stats enable row level security;
alter table public.live_streams enable row level security;
alter table public.pk_matches enable row level security;
alter table public.live_gifts enable row level security;
alter table public.live_comments enable row level security;
alter table public.live_participants enable row level security;

create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

create policy "listings_select_all" on public.listings for select using (true);
create policy "listings_insert_own" on public.listings for insert with check (auth.uid() = owner_id);
create policy "listings_update_own" on public.listings for update using (auth.uid() = owner_id);
create policy "listings_delete_own" on public.listings for delete using (auth.uid() = owner_id);

create policy "listing_photos_select_all" on public.listing_photos for select using (true);
create policy "listing_photos_write_owner" on public.listing_photos for all using (
  exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid())
);

create policy "favorites_own" on public.favorites for all using (auth.uid() = user_id);

create policy "reports_insert_any" on public.reports for insert with check (true);
create policy "reports_select_admin" on public.reports for select using (true);

create policy "reviews_select_all" on public.realtor_reviews for select using (true);
create policy "reviews_insert_auth" on public.realtor_reviews for insert with check (true);

create policy "realtor_stats_select_all" on public.realtor_monthly_stats for select using (true);

create policy "live_streams_select_all" on public.live_streams for select using (true);
create policy "live_streams_insert_auth" on public.live_streams for insert with check (true);
create policy "live_streams_update_host" on public.live_streams for update using (true);

create policy "pk_matches_select_all" on public.pk_matches for select using (true);
create policy "pk_matches_write" on public.pk_matches for all using (true);

create policy "live_gifts_select_all" on public.live_gifts for select using (true);
create policy "live_gifts_insert_any" on public.live_gifts for insert with check (true);

create policy "live_comments_select_all" on public.live_comments for select using (true);
create policy "live_comments_insert_any" on public.live_comments for insert with check (true);

create policy "live_participants_select_all" on public.live_participants for select using (true);
create policy "live_participants_insert_any" on public.live_participants for insert with check (true);

-- =====================================================================
-- 8. Başlanğıc kateqoriya/rayon məlumatları (nümunə)
-- =====================================================================
insert into public.categories (name, slug) values
  ('Mənzil', 'menzil'),
  ('Villa', 'villa'),
  ('Ofis', 'ofis'),
  ('Torpaq', 'torpaq'),
  ('Qaraj', 'qaraj')
on conflict do nothing;

insert into public.districts (city, name) values
  ('Bakı', 'Yasamal'),
  ('Bakı', 'Nəsimi'),
  ('Bakı', 'Nərimanov'),
  ('Bakı', 'Xətai'),
  ('Bakı', 'Səbail'),
  ('Bakı', 'Binəqədi'),
  ('Bakı', 'Suraxanı'),
  ('Bakı', 'Abşeron')
on conflict do nothing;

-- Storage bucket-lar (listings şəkil/video üçün) — Dashboard → Storage-da
-- əl ilə "listings" adlı public bucket yaratmağı unutmayın, ya da:
-- insert into storage.buckets (id, name, public) values ('listings','listings', true) on conflict do nothing;
