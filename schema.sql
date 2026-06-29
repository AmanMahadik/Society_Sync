-- SocietySync Professional Multi-Tenant Schema Setup
-- Run this inside your Supabase SQL Editor to rebuild the database from scratch

-- 1. CLEAN UP LEGACY TABLES (Precautionary Drop)
drop table if exists public.maintenance cascade;
drop table if exists public.visitors cascade;
drop table if exists public.sos_alerts cascade;
drop table if exists public.complaints cascade;
drop table if exists public.announcements cascade;
drop table if exists public.society_admins cascade;
drop table if exists public.society_requests cascade;
drop table if exists public.profiles cascade;
drop table if exists public.societies cascade;

-- Enable UUID Extension
create extension if not exists "uuid-ossp";

-- =======================================================
-- 2. CORE SYSTEM TABLES
-- =======================================================

-- A. SOCIETIES
create table public.societies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  state text not null,
  city text not null,
  pincode text not null,
  society_code text unique not null, -- Format: SS-STATE-RANDOM e.g. SS-MH-4821
  admin_email text not null,
  admin_phone text,
  total_units integer default 0,
  status text default 'active' check (status in ('active', 'suspended')),
  created_at timestamp with time zone default now()
);

-- B. PROFILES (Extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null check (role in ('master_admin', 'admin', 'resident')),
  society_id uuid references public.societies(id) on delete set null, -- Null for master_admin
  full_name text,
  wing text,
  flat_number text,
  created_at timestamp with time zone default now()
);

-- Trigger function to automatically create profile row on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  default_role text;
begin
  if new.email = 'societysync5@gmail.com' then
    default_role := 'master_admin';
  else
    default_role := coalesce(new.raw_user_meta_data->>'role', 'resident');
  end if;

  insert into public.profiles (
    id,
    email,
    role,
    society_id,
    full_name,
    wing,
    flat_number
  ) values (
    new.id,
    new.email,
    default_role,
    case 
      when new.raw_user_meta_data->>'society_id' is not null and new.raw_user_meta_data->>'society_id' <> '' 
      then (new.raw_user_meta_data->>'society_id')::uuid 
      else null 
    end,
    coalesce(new.raw_user_meta_data->>'full_name', 'New Resident'),
    new.raw_user_meta_data->>'wing',
    new.raw_user_meta_data->>'flat_number'
  ) on conflict (id) do nothing;
  return new;
end;
$$;

-- Register the trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- C. SOCIETY REGISTRATION REQUESTS (Pending Review Queue)
create table public.society_requests (
  id bigint primary key generated always as identity,
  name text not null,
  address text not null,
  state text not null,
  city text not null,
  pincode text not null,
  admin_name text not null,
  admin_email text not null,
  admin_phone text not null,
  total_units integer not null,
  document_url text,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  created_at timestamp with time zone default now()
);

-- D. SOCIETY ADMINS (Stores credentials generated for approved admins)
create table public.society_admins (
  id bigint primary key generated always as identity,
  society_id uuid references public.societies(id) on delete cascade,
  admin_email text not null,
  generated_password text not null,
  society_code text not null,
  created_at timestamp with time zone default now()
);

-- =======================================================
-- 3. SOCIETY OPERATIONS TABLES
-- =======================================================

-- E. ANNOUNCEMENTS
create table public.announcements (
  id bigint primary key generated always as identity,
  society_id uuid references public.societies(id) on delete cascade,
  title text not null,
  body text not null,
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default now()
);

-- F. COMPLAINTS (Scoped Resident Complaints)
create table public.complaints (
  id bigint primary key generated always as identity,
  society_id uuid references public.societies(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  status text default 'pending' check (status in ('pending', 'acknowledged', 'resolved')),
  created_at timestamp with time zone default now()
);

-- G. SOS ALERTS (Realtime Emergency Triggers)
create table public.sos_alerts (
  id bigint primary key generated always as identity,
  society_id uuid references public.societies(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  wing text not null,
  flat_number text not null,
  description text,
  status text default 'active' check (status in ('active', 'resolved')),
  created_at timestamp with time zone default now()
);

-- H. VISITORS (Security Gate Logs)
create table public.visitors (
  id bigint primary key generated always as identity,
  society_id uuid references public.societies(id) on delete cascade,
  name text not null,
  phone text,
  wing text not null,
  flat_number text not null,
  purpose text,
  check_in timestamp with time zone default now(),
  check_out timestamp with time zone
);

-- I. MAINTENANCE (Monthly Dues & Billings)
create table public.maintenance (
  id bigint primary key generated always as identity,
  society_id uuid references public.societies(id) on delete cascade,
  wing text not null,
  flat_number text not null,
  amount decimal(10,2) not null,
  month date not null,
  status text default 'unpaid' check (status in ('unpaid', 'paid')),
  created_at timestamp with time zone default now()
);

-- =======================================================
-- 4. ROW-LEVEL SECURITY (RLS) POLICIES
-- =======================================================

-- Enable RLS on all tables
alter table public.societies enable row level security;
alter table public.profiles enable row level security;
alter table public.society_requests enable row level security;
alter table public.society_admins enable row level security;
alter table public.announcements enable row level security;
alter table public.complaints enable row level security;
alter table public.sos_alerts enable row level security;
alter table public.visitors enable row level security;
alter table public.maintenance enable row level security;

-- Define RLS Policies with Master Admin God-Mode Bypass

-- Security definer helpers to prevent policy recursion loops
create or replace function public.is_master_admin(user_id uuid)
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (
    select 1 from public.profiles 
    where id = user_id and role = 'master_admin'
  );
end;
$$;

create or replace function public.get_user_society_id(user_id uuid)
returns uuid
language plpgsql
security definer
as $$
begin
  return (select society_id from public.profiles where id = user_id);
end;
$$;

create or replace function public.get_current_user_role()
returns text
language plpgsql
security definer
as $$
begin
  return (select role from public.profiles where id = auth.uid());
end;
$$;

-- 1. Societies
create policy "Societies isolation and master admin access" on public.societies
  for all to authenticated
  using (
    id = public.get_user_society_id(auth.uid())
    or public.is_master_admin(auth.uid())
  );

-- Allow public read access to societies for registration code validation
create policy "Allow public read access to societies for registration" on public.societies
  for select to anon, authenticated
  using (true);

-- 2. Profiles
create policy "Profiles isolation and master admin access" on public.profiles
  for all to authenticated
  using (
    id = auth.uid()
    or society_id = public.get_user_society_id(auth.uid())
    or public.is_master_admin(auth.uid())
  );

-- Allow public inserts into profiles for signup registration
create policy "Allow inserts for auth signups" on public.profiles
  for insert with check (true);

-- 3. Society Requests
create policy "Society requests visibility" on public.society_requests
  for all to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) = 'master_admin'
  );

-- Allow public insertion of requests (so users can register from portal landing page)
create policy "Allow public to insert requests" on public.society_requests
  for insert with check (true);

-- 4. Society Admins
create policy "Society admins visibility" on public.society_admins
  for all to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) = 'master_admin'
  );

-- 5. Announcements
create policy "Announcements isolation and master admin access" on public.announcements
  for all to authenticated
  using (
    society_id = (select society_id from public.profiles where id = auth.uid())
    or (select role from public.profiles where id = auth.uid()) = 'master_admin'
  );

-- 6. Complaints
create policy "Complaints isolation and master admin access" on public.complaints
  for all to authenticated
  using (
    society_id = (select society_id from public.profiles where id = auth.uid())
    or (select role from public.profiles where id = auth.uid()) = 'master_admin'
  );

-- 7. SOS Alerts
create policy "SOS Alerts isolation and master admin access" on public.sos_alerts
  for all to authenticated
  using (
    society_id = (select society_id from public.profiles where id = auth.uid())
    or (select role from public.profiles where id = auth.uid()) = 'master_admin'
  );

-- 8. Visitors
create policy "Visitors isolation and master admin access" on public.visitors
  for all to authenticated
  using (
    society_id = (select society_id from public.profiles where id = auth.uid())
    or (select role from public.profiles where id = auth.uid()) = 'master_admin'
  );

-- 9. Maintenance
create policy "Maintenance isolation and master admin access" on public.maintenance
  for all to authenticated
  using (
    society_id = (select society_id from public.profiles where id = auth.uid())
    or (select role from public.profiles where id = auth.uid()) = 'master_admin'
  );

-- =======================================================
-- 5. INDEXES FOR HIGH PERFORMANCE
-- =======================================================
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_society on public.profiles(society_id);
create index if not exists idx_announcements_society on public.announcements(society_id);
create index if not exists idx_complaints_society on public.complaints(society_id);
create index if not exists idx_sos_alerts_society on public.sos_alerts(society_id);
create index if not exists idx_visitors_society on public.visitors(society_id);
create index if not exists idx_maintenance_society on public.maintenance(society_id);

-- =======================================================
-- 6. SECURITY DEFINER RPC HELPER FUNCTIONS
-- =======================================================

-- A. Toggle User Role (Bypasses RLS for Master Admin calls)
create or replace function public.toggle_user_role(target_user_id uuid, new_role text)
returns void
language plpgsql
security definer
as $$
begin
  -- Only allow master_admins to toggle roles!
  if (select role from public.profiles where id = auth.uid()) <> 'master_admin' then
    raise exception 'Unauthorized: Only master administrators can toggle roles.';
  end if;

  update public.profiles
  set role = new_role
  where id = target_user_id;
end;
$$;

-- B. Approve Society Request (Creates Auth User, Profile, Society, and credentials transactionally)
create or replace function public.approve_society_request(
  req_id bigint,
  gen_code text,
  gen_password text
)
returns uuid
language plpgsql
security definer
as $$
declare
  req record;
  new_user_id uuid;
  new_soc_id uuid;
begin
  -- 1. Verify caller is master_admin
  if (select role from public.profiles where id = auth.uid()) <> 'master_admin' then
    raise exception 'Unauthorized: Only master administrators can approve requests.';
  end if;

  -- 2. Fetch the request details
  select * into req from public.society_requests where id = req_id;
  if not found then
    raise exception 'Society request not found.';
  end if;

  -- 3. Create the auth user in auth.users
  new_user_id := gen_random_uuid();
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    req.admin_email,
    crypt(gen_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', req.admin_name),
    now(),
    now()
  );

  -- Create the identity link in auth.identities
  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    new_user_id,
    new_user_id,
    jsonb_build_object('sub', new_user_id, 'email', req.admin_email),
    'email',
    new_user_id::text,
    now(),
    now(),
    now()
  );

  -- 4. Create the society record
  new_soc_id := gen_random_uuid();
  insert into public.societies (
    id,
    name,
    address,
    state,
    city,
    pincode,
    society_code,
    admin_email,
    admin_phone,
    total_units
  ) values (
    new_soc_id,
    req.name,
    req.address,
    req.state,
    req.city,
    req.pincode,
    gen_code,
    req.admin_email,
    req.admin_phone,
    req.total_units
  );

  -- 5. Insert profile record (upsert to handle trigger collisions)
  insert into public.profiles (
    id,
    email,
    role,
    society_id,
    full_name,
    wing,
    flat_number
  ) values (
    new_user_id,
    req.admin_email,
    'admin',
    new_soc_id,
    req.admin_name,
    'HQ',
    'Admin'
  )
  on conflict (id) do update
  set role = 'admin',
      society_id = new_soc_id,
      full_name = req.admin_name,
      wing = 'HQ',
      flat_number = 'Admin';

  -- 6. Insert credentials record into society_admins
  insert into public.society_admins (
    society_id,
    admin_email,
    generated_password,
    society_code
  ) values (
    new_soc_id,
    req.admin_email,
    gen_password,
    gen_code
  );

  -- 7. Update request status
  update public.society_requests
  set status = 'approved'
  where id = req_id;

  return new_user_id;
end;
$$;

-- =======================================================
-- 7. PRE-SEEDED SYSTEM ACCOUNTS
-- =======================================================

-- Seed Master Admin in auth.users (Password: Admin@123)
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '482f1c5a-4c26-4483-8f5f-b4feb384500a', -- Hardcoded UID
  'authenticated',
  'authenticated',
  'societysync5@gmail.com',
  '$2b$10$XUA5HFssRhGTLaTrDVVh2uBissBFiGZR2yJDFG0IoNQfNnJoTPUL.',
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Master Admin"}',
  now(),
  now()
) on conflict (id) do nothing;

-- Seed Master Admin in auth.identities
insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) values (
  '482f1c5a-4c26-4483-8f5f-b4feb384500a',
  '482f1c5a-4c26-4483-8f5f-b4feb384500a',
  '{"sub":"482f1c5a-4c26-4483-8f5f-b4feb384500a","email":"societysync5@gmail.com"}'::jsonb,
  'email',
  '482f1c5a-4c26-4483-8f5f-b4feb384500a',
  now(),
  now(),
  now()
) on conflict do nothing;

-- Seed Master Admin in public.profiles
insert into public.profiles (
  id,
  email,
  role,
  society_id,
  full_name,
  wing,
  flat_number
) values (
  '482f1c5a-4c26-4483-8f5f-b4feb384500a',
  'societysync5@gmail.com',
  'master_admin',
  null,
  'Master Admin',
  'HQ',
  'Admin'
) on conflict (id) do nothing;


