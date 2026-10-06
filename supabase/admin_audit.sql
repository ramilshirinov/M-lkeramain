-- =====================================================================
-- MÜLKERA — Admin Audit & Activity Logs Cədvəli
-- İstifadəçilərin giriş-çıxışlarını və fəaliyyətlərini qeydə almaq üçün
-- =====================================================================

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null, -- AUTH_LOGIN, AUTH_LOGOUT, PAGE_VISIT, LISTING_CREATE və s.
  user_id uuid references public.profiles(id) on delete set null,
  user_email text,
  user_name text,
  role text default 'guest',
  details text,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_created_at on public.audit_logs (created_at desc);
create index if not exists idx_audit_logs_action on public.audit_logs (action);
create index if not exists idx_audit_logs_user on public.audit_logs (user_id);

-- RLS: Yalnız admin və ya service_role baxa bilər
alter table public.audit_logs enable row level security;

create policy "Admins can view audit logs"
  on public.audit_logs
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );
