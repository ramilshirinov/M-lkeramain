-- =====================================================================
-- MÜLKERA — Tam Supabase SQL Sxemi və Təhlükəsizlik Siyasətləri (RLS)
-- Bu faylı Supabase Dashboard → SQL Editor bölməsində icra edə bilərsiniz.
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
  commission_rate numeric(5,2) default 1.5,
  legal_status text,
  rating numeric(3,2) default 5.00,
  rating_count integer default 0,
  service_areas text[] default array['Yasamal', 'Nəsimi']::text[],
  specialties text[] default array['Yeni Tikili', 'Mənzil']::text[],
  sales_count integer default 0,
  sales_speed_days integer default 14,
  monthly_rank integer default 1,
  facebook_url text,
  instagram_url text,
  whatsapp text,
  email_notifications boolean default true,
  sms_notifications boolean default false,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Əgər sütunlar əvvəldən mövcud deyildisə, əlavə olunması:
alter table public.profiles add column if not exists service_areas text[] default array['Yasamal', 'Nəsimi']::text[];
alter table public.profiles add column if not exists specialties text[] default array['Yeni Tikili', 'Mənzil']::text[];
alter table public.profiles add column if not exists sales_count integer default 0;
alter table public.profiles add column if not exists sales_speed_days integer default 14;
alter table public.profiles add column if not exists monthly_rank integer default 1;
alter table public.profiles add column if not exists facebook_url text;
alter table public.profiles add column if not exists instagram_url text;
alter table public.profiles add column if not exists whatsapp text;
alter table public.profiles add column if not exists email_notifications boolean default true;
alter table public.profiles add column if not exists sms_notifications boolean default false;
alter table public.profiles add column if not exists bio text;

-- Qeydiyyatdan keçən hər auth.users üçün profil yaradılması
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
-- 2. KATEQORİYALAR VƏ RAYONLAR
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
-- 3. ELANLAR (listings & listing_photos)
-- =====================================================================
create table if not exists public.listings (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  transaction_type text not null default 'sale' check (transaction_type in ('sale', 'rent', 'daily_rent', 'daily')),
  category_id bigint references public.categories(id),
  district_id bigint references public.districts(id),
  city text default 'Bakı',
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
create index if not exists idx_listings_transaction on public.listings(transaction_type);

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
-- 4. RİELTOR REYTİNQ VƏ ŞİKAYƏT SİSTEMİ
-- =====================================================================
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

alter table public.realtor_reviews add column if not exists is_reported boolean default false;
alter table public.realtor_reviews add column if not exists is_hidden boolean default false;
alter table public.realtor_reviews add column if not exists report_count integer default 0;

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

create index if not exists idx_review_reports_status on public.review_reports(status);
create index if not exists idx_realtor_reviews_realtor on public.realtor_reviews(realtor_id);

-- Rieltor Aylıq Statistikası
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
  updated_at timestamptz default now(),
  unique(realtor_id, period)
);

create index if not exists idx_realtor_stats_score on public.realtor_monthly_stats(score desc);

-- =====================================================================
-- 4.1 AVTOMATİK AYLIQ SIRALAMA ALQORİTMİ (recompute_realtor_rankings)
-- Satış sayı, satış sürəti, satış tezliyi və müştəri ulduzlarına əsaslanır
-- =====================================================================
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
    where p.role = 'realtor'
  ) loop
    -- Xal hesablama düsturu:
    -- (Satış sayı * 30) + (Orta reytinq * 15) + (Rəy sayı * 5) + (Aktiv elan * 2) + Sürət bonusu
    calc_score := (r.s_count * 30.0) + (r.rev_avg * 15.0) + (r.rev_count * 5.0) + (r.a_listings * 2.0) + greatest(0, 30 - r.s_speed);

    -- Profil cədvəlində ulduz və rəy sayını yeniləyirik
    update public.profiles
    set rating = round(r.rev_avg, 2),
        rating_count = r.rev_count,
        updated_at = now()
    where id = r.realtor_id;

    -- Aylıq statistika cədvəlinə daxil edirik / yeniləyirik
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

  -- 1-ci, 2-ci, 3-cü yerləri (sıralama dərəcələrini) təyin edirik
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
-- 5. MESAJLAR VƏ ÇAT (messages)
-- =====================================================================
create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  sender_id text not null,
  receiver_id text not null,
  sender_name text,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_sender on public.messages(sender_id);
create index if not exists idx_messages_receiver on public.messages(receiver_id);

-- =====================================================================
-- 6. RLS (Row Level Security) SİYASƏTLƏRİ
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.listing_photos enable row level security;
alter table public.favorites enable row level security;
alter table public.realtor_reviews enable row level security;
alter table public.review_reports enable row level security;
alter table public.realtor_monthly_stats enable row level security;
alter table public.messages enable row level security;

-- Profiles: hər kəs oxuya bilər, istifadəçi yalnız öz profilini yeniləyə bilər
create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Listings: hər kəs aktiv elanları görə bilər, sahibi idarə edə bilər
create policy "listings_select_all" on public.listings for select using (true);
create policy "listings_insert_auth" on public.listings for insert with check (true);
create policy "listings_update_own" on public.listings for update using (auth.uid() = owner_id);
create policy "listings_delete_own" on public.listings for delete using (auth.uid() = owner_id);

-- Listing Photos
create policy "listing_photos_select_all" on public.listing_photos for select using (true);
create policy "listing_photos_insert_all" on public.listing_photos for insert with check (true);

-- Favorites
create policy "favorites_own" on public.favorites for all using (auth.uid() = user_id);

-- Reviews & Reports
create policy "reviews_select_all" on public.realtor_reviews for select using (true);
create policy "reviews_insert_any" on public.realtor_reviews for insert with check (true);
create policy "reviews_update_admin" on public.realtor_reviews for update using (true);
create policy "reviews_delete_admin" on public.realtor_reviews for delete using (true);

create policy "reports_insert_any" on public.review_reports for insert with check (true);
create policy "reports_select_all" on public.review_reports for select using (true);
create policy "reports_update_admin" on public.review_reports for update using (true);

-- Realtor Stats
create policy "realtor_stats_select_all" on public.realtor_monthly_stats for select using (true);

-- Messages
create policy "messages_select_participant" on public.messages for select using (true);
create policy "messages_insert_sender" on public.messages for insert with check (true);

-- =====================================================================
-- 7. STORAGE BUCKET-LAR (avatars və listings)
-- =====================================================================
-- Supabase Dashboard -> Storage bölməsində "avatars" və "listings" adında
-- iki Public bucket yaradın və ya aşağıdakı SQL sorğusunu icra edin:
insert into storage.buckets (id, name, public) 
values 
  ('avatars', 'avatars', true),
  ('listings', 'listings', true)
on conflict (id) do update set public = true;

-- Storage oxuma və yükləmə icazələri (RLS)
create policy "Public Access to Avatars" on storage.objects for select using (bucket_id = 'avatars');
create policy "Allow Upload to Avatars" on storage.objects for insert with check (bucket_id = 'avatars');
create policy "Allow Update in Avatars" on storage.objects for update using (bucket_id = 'avatars');

create policy "Public Access to Listings" on storage.objects for select using (bucket_id = 'listings');
create policy "Allow Upload to Listings" on storage.objects for insert with check (bucket_id = 'listings');
create policy "Allow Update in Listings" on storage.objects for update using (bucket_id = 'listings');
