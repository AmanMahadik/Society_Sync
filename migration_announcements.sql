-- ========================================================
-- RUN THIS IN YOUR SUPABASE SQL EDITOR TO SETUP ANNOUNCEMENTS
-- ========================================================

-- Safe Alterations (If you already have the announcements table)
alter table public.announcements add column if not exists is_pinned boolean default false not null;
alter table public.announcements add column if not exists attachment_url text;

-- Enable RLS (if not already enabled)
alter table public.announcements enable row level security;

-- Create Performance Index (if not already exists)
create index if not exists idx_announcements_society_id on public.announcements(society_id);

-- RLS Policy: Select (Allows approved society residents to read)
drop policy if exists "Allow read for society residents" on public.announcements;
create policy "Allow read for society residents" on public.announcements
  for select
  using (
    auth.uid() in (
      select id from public.profiles
      where society_id = announcements.society_id
      and status = 'approved'
    )
  );

-- RLS Policy: All Actions (Allows society admins to publish/delete/pin notices)
drop policy if exists "Allow write/delete for society admins" on public.announcements;
create policy "Allow write/delete for society admins" on public.announcements
  for all
  using (
    auth.uid() in (
      select id from public.profiles
      where society_id = announcements.society_id
      and role = 'admin'
      and status = 'approved'
    )
  );
