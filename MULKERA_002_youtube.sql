-- MULKERA_002_youtube.sql — idempotent (təkrar işlədilə bilər)

-- 1) listing_photos: URL-dən avtomatik youtube_video_id (generated, heç kim yazmır)
alter table public.listing_photos
  add column if not exists youtube_video_id text
  generated always as (
    substring(url from '(?:youtube\.com/watch\?v=|youtu\.be/|youtube(?:-nocookie)?\.com/embed/)([A-Za-z0-9_-]{11})')
  ) stored;

create index if not exists idx_listing_photos_youtube
  on public.listing_photos (youtube_video_id) where youtube_video_id is not null;

-- 2) Yükləmə izləmə cədvəli (yalnız service_role)
create table if not exists public.youtube_uploads (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null,                 -- FK yoxdur: istifadəçi silinsə də izləmə qalsın
  video_id    text unique,
  status      text not null default 'initiated'
              check (status in ('initiated','uploaded','deleted','failed')),
  file_name   text,
  file_size   bigint,
  mime_type   text,
  last_error  text,
  created_at  timestamptz not null default now(),
  uploaded_at timestamptz,
  deleted_at  timestamptz
);
create index if not exists idx_youtube_uploads_owner  on public.youtube_uploads (owner_id, created_at desc);
create index if not exists idx_youtube_uploads_status on public.youtube_uploads (status, created_at);

alter table public.youtube_uploads enable row level security;
revoke all on public.youtube_uploads from anon, authenticated;   -- policy yoxdur → yalnız service_role

-- 3) Yetim videolar: yüklənib, amma heç bir elana bağlı deyil
create or replace function public.youtube_orphans(p_older_than interval default interval '6 hours',
                                                  p_limit int default 20)
returns table (id uuid, video_id text)
language sql stable security definer set search_path = public as $$
  select u.id, u.video_id
  from public.youtube_uploads u
  where u.status = 'uploaded'
    and u.video_id is not null
    and u.uploaded_at < now() - p_older_than
    and not exists (select 1 from public.listing_photos p where p.youtube_video_id = u.video_id)
  order by u.uploaded_at
  limit p_limit;
$$;
revoke all on function public.youtube_orphans(interval, int) from public, anon, authenticated;
grant execute on function public.youtube_orphans(interval, int) to service_role;
