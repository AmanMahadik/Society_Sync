-- SocietySync Unified Multi-Tenant Schema Setup
-- Run this inside your Supabase SQL Editor to clean up and rebuild the database from scratch.

-- 1. CLEAN UP LEGACY TABLES (Precautionary Drop)
drop table if exists public.portal_audit_log cascade;
drop table if exists public.poll_votes cascade;
drop table if exists public.poll_options cascade;
drop table if exists public.polls cascade;
drop table if exists public.notifications cascade;
drop table if exists public.user_approvals cascade;
drop table if exists public.chat_messages cascade;
drop table if exists public.chat_threads cascade;
drop table if exists public.complaints cascade;
drop table if exists public.parking_requests cascade;
drop table if exists public.parking_slots cascade;
drop table if exists public.maintenance_dues cascade;
drop table if exists public.transactions cascade;
drop table if exists public.events cascade;
drop table if exists public.society_admins cascade;
drop table if exists public.society_requests cascade;
drop table if exists public.profiles cascade;
drop table if exists public.societies cascade;
drop table if exists public.society_settings cascade;
drop table if exists public.visitors cascade;
drop table if exists public.sos_alerts cascade;
drop table if exists public.announcements cascade;

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
  status text default 'active' check (status in ('active', 'suspended', 'pending_verification', 'rejected')),
  rejection_reason text,
  created_at timestamp with time zone default now()
);

-- B. PROFILES (Extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null check (role in ('master_admin', 'admin', 'owner', 'renter', 'guard', 'resident')),
  society_id uuid references public.societies(id) on delete set null, -- Null for master_admin
  full_name text,
  wing text,
  flat_number text,
  phone text,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_at timestamp with time zone,
  google_picture_url text,
  vehicle_number text,
  bio text,
  notification_token text,
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
  default_status text;
  soc_id uuid;
  existing_count integer;
begin
  -- 1. Determine the society_id from metadata
  begin
    if new.raw_user_meta_data is not null 
       and new.raw_user_meta_data->>'society_id' is not null 
       and new.raw_user_meta_data->>'society_id' <> '' 
       and new.raw_user_meta_data->>'society_id' <> 'null' then
      soc_id := (new.raw_user_meta_data->>'society_id')::uuid;
    else
      soc_id := null;
    end if;
  exception when others then
    soc_id := null;
  end;

  -- 2. Determine role and status
  if new.email = 'societysync5@gmail.com' then
    default_role := 'master_admin';
    default_status := 'approved';
  else
    if soc_id is not null then
      -- Count active profiles already in this society
      begin
        select count(*) into existing_count from public.profiles where society_id = soc_id;
      exception when others then
        existing_count := 0;
      end;
      
      if existing_count = 0 then
        -- First registered user is automatically approved as the Admin!
        default_role := 'admin';
        default_status := 'approved';
        
        -- Try to update society_admins mapping
        begin
          update public.society_admins
          set user_id = new.id
          where society_id = soc_id;
        exception when others then
          null;
        end;
      else
        -- Subsequent users keep their selected role (owner, renter, guard) and start as pending
        begin
          default_role := coalesce(new.raw_user_meta_data->>'role', 'owner');
        exception when others then
          default_role := 'owner';
        end;
        default_status := 'pending';
      end if;
    else
      begin
        default_role := coalesce(new.raw_user_meta_data->>'role', 'owner');
      exception when others then
        default_role := 'owner';
      end;
      default_status := 'pending';
    end if;
  end if;

  -- 3. Insert profile row
  begin
    insert into public.profiles (
      id,
      email,
      role,
      status,
      society_id,
      full_name,
      wing,
      flat_number,
      phone,
      google_picture_url,
      approved_at
    ) values (
      new.id,
      new.email,
      default_role,
      default_status,
      soc_id,
      coalesce(new.raw_user_meta_data->>'full_name', 'New Resident'),
      new.raw_user_meta_data->>'wing',
      new.raw_user_meta_data->>'flat_number',
      new.raw_user_meta_data->>'phone_number',
      new.raw_user_meta_data->>'google_picture_url',
      case when default_status = 'approved' then now() else null end
    ) on conflict (id) do nothing;
  exception when others then
    -- Fallback: Insert with basic fields if extra columns fail
    begin
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
        soc_id,
        coalesce(new.raw_user_meta_data->>'full_name', 'New Resident'),
        new.raw_user_meta_data->>'wing',
        new.raw_user_meta_data->>'flat_number'
      ) on conflict (id) do nothing;
    exception when others then
      null;
    end;
  end;
  
  return new;
end;
$$;

-- Register the trigger
create or replace trigger on_auth_user_created
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
  admin_password text,
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
  user_id uuid references auth.users(id) on delete cascade, -- Link to authed user
  admin_email text not null,
  generated_password text not null,
  society_code text not null,
  created_at timestamp with time zone default now()
);

-- =======================================================
-- 3. SOCIETY OPERATIONS TABLES
-- =======================================================

-- E. EVENTS TABLE (Festival Ledger)
create table public.events (
  id bigint primary key generated always as identity,
  society_id uuid references public.societies(id) on delete cascade,
  name text not null, -- e.g., 'Ganesh Chaturthi 2026'
  description text,
  event_date date,
  total_income decimal(12,2) default 0.00,
  total_expense decimal(12,2) default 0.00,
  balance decimal(12,2) generated always as (total_income - total_expense) stored,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default now(),
  is_active boolean default true
);

-- F. TRANSACTIONS TABLE (Income & Expense Entries)
create table public.transactions (
  id bigint primary key generated always as identity,
  society_id uuid references public.societies(id) on delete cascade,
  event_id bigint references public.events(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  category text not null, -- e.g., 'Chandaa', 'Pandal', 'Sound System'
  amount decimal(12,2) not null,
  description text,
  bill_image_url text, -- Supabase Storage URL
  recorded_by uuid references public.profiles(id) on delete set null,
  recorded_at timestamp with time zone default now()
);

-- G. MAINTENANCE DUES TABLE
create table public.maintenance_dues (
  id bigint primary key generated always as identity,
  society_id uuid references public.societies(id) on delete cascade,
  flat_number text not null,
  wing text not null,
  month date not null, -- First day of month
  amount decimal(10,2) not null,
  paid_amount decimal(10,2) default 0.00,
  status text default 'pending' check (status in ('pending', 'partial', 'paid', 'overdue')),
  due_date date not null,
  paid_at timestamp with time zone,
  interest_charged decimal(10,2) default 0.00,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(society_id, wing, flat_number, month)
);

-- H. PARKING SLOTS TABLE
create table public.parking_slots (
  id bigint primary key generated always as identity,
  society_id uuid references public.societies(id) on delete cascade,
  slot_number text not null check (slot_number like 'V%'), -- V1 to V10
  is_available boolean default true,
  created_at timestamp with time zone default now(),
  unique(society_id, slot_number)
);

-- I. PARKING REQUESTS TABLE (Explicitly named constraints for PostgREST cached join hints)
create table public.parking_requests (
  id bigint primary key generated always as identity,
  society_id uuid references public.societies(id) on delete cascade,
  user_id uuid not null,
  slot_id bigint references public.parking_slots(id) on delete cascade,
  date date not null,
  time_slot text not null check (time_slot in ('morning', 'afternoon', 'evening', 'overnight')),
  vehicle_number text not null,
  visitor_name text,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected', 'completed')),
  created_at timestamp with time zone default now(),
  approved_at timestamp with time zone,
  approved_by uuid,
  
  constraint parking_requests_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade,
  constraint parking_requests_approved_by_fkey foreign key (approved_by) references public.profiles(id) on delete set null
);

-- J. COMPLAINTS TABLE (Explicitly named constraints for PostgREST cached join hints)
create table public.complaints (
  id bigint primary key generated always as identity,
  society_id uuid references public.societies(id) on delete cascade,
  user_id uuid not null,
  type text not null check (type in ('water_low', 'motor_off', 'electricity', 'security', 'other')),
  wing text not null,
  flat_number text not null,
  description text,
  status text default 'pending' check (status in ('pending', 'acknowledged', 'resolved', 'ignored')),
  priority text default 'high' check (priority in ('low', 'medium', 'high', 'emergency')),
  acknowledged_by uuid,
  acknowledged_at timestamp with time zone,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  target_role text[],
  
  constraint complaints_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade,
  constraint complaints_acknowledged_by_fkey foreign key (acknowledged_by) references public.profiles(id) on delete set null
);

-- K. CHAT THREADS TABLE (Society Council)
create table public.chat_threads (
  id bigint primary key generated always as identity,
  society_id uuid references public.societies(id) on delete cascade,
  title text not null,
  category text not null check (category in ('water-infrastructure', 'budget', 'events', 'maintenance', 'security', 'general')),
  created_by uuid references public.profiles(id) on delete set null,
  is_archived boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- L. CHAT MESSAGES TABLE
create table public.chat_messages (
  id bigint primary key generated always as identity,
  society_id uuid references public.societies(id) on delete cascade,
  thread_id bigint references public.chat_threads(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  content text not null,
  is_pinned boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- M. USER APPROVALS TABLE (Admin tracking)
create table public.user_approvals (
  id bigint primary key generated always as identity,
  society_id uuid references public.societies(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  approved_by uuid references public.profiles(id) on delete set null,
  status text not null check (status in ('approved', 'rejected')),
  reason text,
  created_at timestamp with time zone default now(),
  resolved_at timestamp with time zone default now()
);

-- N. NOTIFICATIONS TABLE
create table public.notifications (
  id bigint primary key generated always as identity,
  society_id uuid references public.societies(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  data jsonb,
  is_read boolean default false,
  created_at timestamp with time zone default now()
);

-- O. SOCIETY SETTINGS TABLE (Single row configuration per society)
create table public.society_settings (
  id bigint primary key generated always as identity,
  society_id uuid references public.societies(id) on delete cascade unique,
  society_name text not null,
  address text,
  maintenance_rate_per_sqft decimal(10,2) default 3.50,
  late_fee_percentage decimal(5,2) default 2.00,
  parking_slot_count int default 10,
  admin_contact text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- P. VOTING POLLS TABLE
create table public.polls (
  id bigint primary key generated always as identity,
  society_id uuid references public.societies(id) on delete cascade,
  title text not null,
  description text,
  thread_id bigint references public.chat_threads(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  expires_at timestamp with time zone,
  status text default 'active' check (status in ('active', 'closed')),
  created_at timestamp with time zone default now()
);

-- Q. POLL OPTIONS TABLE
create table public.poll_options (
  id bigint primary key generated always as identity,
  society_id uuid references public.societies(id) on delete cascade,
  poll_id bigint references public.polls(id) on delete cascade,
  option_text text not null,
  vote_count int default 0,
  created_at timestamp with time zone default now()
);

-- R. POLL VOTES TABLE (Unique constraint ensures single vote per user)
create table public.poll_votes (
  id bigint primary key generated always as identity,
  society_id uuid references public.societies(id) on delete cascade,
  poll_id bigint references public.polls(id) on delete cascade,
  option_id bigint references public.poll_options(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  voted_at timestamp with time zone default now(),
  unique(poll_id, user_id)
);

-- S. PORTAL AUDIT LOG TABLE
create table public.portal_audit_log (
  id bigint primary key generated always as identity,
  action_type text not null,
  performed_by uuid references public.profiles(id) on delete set null,
  society_id uuid references public.societies(id) on delete cascade,
  old_value text,
  new_value text,
  created_at timestamp with time zone default now()
);

-- T. SOS ALERTS (Legacy table pre-seed support)
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

-- U. VISITORS (Gate control logs)
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

-- V. ANNOUNCEMENTS (Council broadcasts)
create table public.announcements (
  id bigint primary key generated always as identity,
  society_id uuid references public.societies(id) on delete cascade,
  title text not null,
  body text not null,
  created_by uuid references public.profiles(id) on delete set null,
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
alter table public.events enable row level security;
alter table public.transactions enable row level security;
alter table public.maintenance_dues enable row level security;
alter table public.parking_slots enable row level security;
alter table public.parking_requests enable row level security;
alter table public.complaints enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;
alter table public.user_approvals enable row level security;
alter table public.notifications enable row level security;
alter table public.society_settings enable row level security;
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;
alter table public.portal_audit_log enable row level security;
alter table public.visitors enable row level security;
alter table public.sos_alerts enable row level security;
alter table public.announcements enable row level security;

-- Security definer helper functions to check access
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

create or replace function public.is_user_approved(user_id uuid)
returns boolean 
language plpgsql
security definer as $$
begin
  return exists (
    select 1 from public.profiles 
    where id = user_id and status = 'approved'
  );
end;
$$;

create or replace function public.is_admin(user_id uuid)
returns boolean 
language plpgsql
security definer as $$
begin
  return exists (
    select 1 from public.profiles 
    where id = user_id and role = 'admin'
  );
end;
$$;

-- RLS Policies Setup

-- 1. Societies
create policy "Societies selection and master admin access" on public.societies
  for all to authenticated
  using (
    id = public.get_user_society_id(auth.uid())
    or public.is_master_admin(auth.uid())
  );

create policy "Allow anon and authenticated selects on societies" on public.societies
  for select to anon, authenticated
  using (true);

-- 2. Profiles
create policy "Profiles tenant isolation" on public.profiles
  for all to authenticated
  using (
    id = auth.uid()
    or society_id = public.get_user_society_id(auth.uid())
    or public.is_master_admin(auth.uid())
  );

create policy "Allow inserts for signup registration" on public.profiles
  for insert with check (true);

-- 3. Society Requests
create policy "Society requests visibility" on public.society_requests
  for all to authenticated
  using (public.is_master_admin(auth.uid()));

create policy "Allow public to submit society requests" on public.society_requests
  for insert with check (true);

-- 4. Society Admins
drop policy if exists "Society admins visibility" on public.society_admins;
create policy "Society admins visibility" on public.society_admins
  for all to authenticated
  using (public.is_master_admin(auth.uid()) or user_id = auth.uid());

-- 5. Operational Tables (Require Approved user or Admin of the society, or Master Admin)
-- Use generic tenant policy format for ease of database rebuild

create policy "Events isolation" on public.events for all to authenticated 
  using (society_id = public.get_user_society_id(auth.uid()) or public.is_master_admin(auth.uid()));

create policy "Transactions isolation" on public.transactions for all to authenticated 
  using (society_id = public.get_user_society_id(auth.uid()) or public.is_master_admin(auth.uid()));

create policy "Maintenance dues isolation" on public.maintenance_dues for all to authenticated 
  using (society_id = public.get_user_society_id(auth.uid()) or public.is_master_admin(auth.uid()));

create policy "Parking slots isolation" on public.parking_slots for all to authenticated 
  using (society_id = public.get_user_society_id(auth.uid()) or public.is_master_admin(auth.uid()));

create policy "Parking requests isolation" on public.parking_requests for all to authenticated 
  using (society_id = public.get_user_society_id(auth.uid()) or public.is_master_admin(auth.uid()));

create policy "Complaints isolation" on public.complaints for all to authenticated 
  using (society_id = public.get_user_society_id(auth.uid()) or public.is_master_admin(auth.uid()));

create policy "Chat threads isolation" on public.chat_threads for all to authenticated 
  using (society_id = public.get_user_society_id(auth.uid()) or public.is_master_admin(auth.uid()));

create policy "Chat messages isolation" on public.chat_messages for all to authenticated 
  using (society_id = public.get_user_society_id(auth.uid()) or public.is_master_admin(auth.uid()));

create policy "User approvals isolation" on public.user_approvals for all to authenticated 
  using (society_id = public.get_user_society_id(auth.uid()) or public.is_master_admin(auth.uid()));

create policy "Notifications isolation" on public.notifications for all to authenticated 
  using (society_id = public.get_user_society_id(auth.uid()) or public.is_master_admin(auth.uid()));

create policy "Society settings isolation" on public.society_settings for all to authenticated 
  using (society_id = public.get_user_society_id(auth.uid()) or public.is_master_admin(auth.uid()));

create policy "Polls isolation" on public.polls for all to authenticated 
  using (society_id = public.get_user_society_id(auth.uid()) or public.is_master_admin(auth.uid()));

create policy "Poll options isolation" on public.poll_options for all to authenticated 
  using (society_id = public.get_user_society_id(auth.uid()) or public.is_master_admin(auth.uid()));

create policy "Poll votes isolation" on public.poll_votes for all to authenticated 
  using (society_id = public.get_user_society_id(auth.uid()) or public.is_master_admin(auth.uid()));

create policy "Portal audit log isolation" on public.portal_audit_log for all to authenticated 
  using (society_id = public.get_user_society_id(auth.uid()) or public.is_master_admin(auth.uid()));

create policy "Visitors isolation" on public.visitors for all to authenticated 
  using (society_id = public.get_user_society_id(auth.uid()) or public.is_master_admin(auth.uid()));

create policy "SOS alerts isolation" on public.sos_alerts for all to authenticated 
  using (society_id = public.get_user_society_id(auth.uid()) or public.is_master_admin(auth.uid()));

create policy "Announcements isolation" on public.announcements for all to authenticated 
  using (society_id = public.get_user_society_id(auth.uid()) or public.is_master_admin(auth.uid()));

-- =======================================================
-- 5. INDEXES FOR HIGH PERFORMANCE
-- =======================================================
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_status on public.profiles(status);
create index if not exists idx_profiles_society on public.profiles(society_id);
create index if not exists idx_announcements_society on public.announcements(society_id);
create index if not exists idx_complaints_society on public.complaints(society_id);
create index if not exists idx_sos_alerts_society on public.sos_alerts(society_id);
create index if not exists idx_visitors_society on public.visitors(society_id);
create index if not exists idx_maintenance_dues_flat on public.maintenance_dues(flat_number);
create index if not exists idx_maintenance_dues_status on public.maintenance_dues(status);
create index if not exists idx_chat_messages_thread on public.chat_messages(thread_id);
create index if not exists idx_notifications_user on public.notifications(user_id);
create index if not exists idx_transactions_event on public.transactions(event_id);
create index if not exists idx_parking_requests_date on public.parking_requests(date);

-- =======================================================
-- 6. SECURITY DEFINER RPC HELPER FUNCTIONS
-- =======================================================

-- A. Toggle User Role
create or replace function public.toggle_user_role(target_user_id uuid, new_role text)
returns void
language plpgsql
security definer
as $$
declare
  user_soc_id uuid;
begin
  -- Only allow master_admins to toggle roles!
  if (select role from public.profiles where id = auth.uid()) <> 'master_admin' then
    raise exception 'Unauthorized: Only master administrators can toggle roles.';
  end if;

  -- Get the user's society_id
  select society_id into user_soc_id from public.profiles where id = target_user_id;

  update public.profiles
  set role = new_role
  where id = target_user_id;

  -- If the new role is admin, link them in society_admins mapping
  if new_role = 'admin' and user_soc_id is not null then
    update public.society_admins
    set user_id = target_user_id
    where society_id = user_soc_id;
  end if;
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
  new_soc_id uuid;
  admin_uid uuid;
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

  -- 3. Create the society record
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
    total_units,
    status
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
    req.total_units,
    'active'
  );

  -- 4. Pre-create society_admins mapping with placeholder
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

  -- 5. Create settings entry automatically
  insert into public.society_settings (
    society_id,
    society_name,
    address,
    maintenance_rate_per_sqft,
    late_fee_percentage,
    parking_slot_count,
    admin_contact
  ) values (
    new_soc_id,
    req.name,
    req.address,
    3.50,
    2.00,
    10,
    req.admin_phone
  );

  -- 6. Pre-seed default parking slots V1-V10 for this society
  insert into public.parking_slots (society_id, slot_number, is_available) values
  (new_soc_id, 'V1', true),
  (new_soc_id, 'V2', true),
  (new_soc_id, 'V3', true),
  (new_soc_id, 'V4', true),
  (new_soc_id, 'V5', true),
  (new_soc_id, 'V6', true),
  (new_soc_id, 'V7', true),
  (new_soc_id, 'V8', true),
  (new_soc_id, 'V9', true),
  (new_soc_id, 'V10', true);

  -- 7. Pre-seed default chat threads for this society
  insert into public.chat_threads (society_id, title, category) values
  (new_soc_id, '#Water-Infrastructure', 'water-infrastructure'),
  (new_soc_id, '#Annual-Budget', 'budget'),
  (new_soc_id, '#Ganesh-Planning', 'events'),
  (new_soc_id, '#General-Complaints', 'general');

  -- 7.5. Create Auth User and Link Identity for the new Admin
  admin_uid := gen_random_uuid();
  
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
    admin_uid,
    'authenticated',
    'authenticated',
    req.admin_email,
    extensions.crypt(gen_password, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object(
      'full_name', req.admin_name,
      'role', 'admin',
      'society_id', new_soc_id::text,
      'wing', 'HQ',
      'flat_number', 'Admin',
      'phone_number', req.admin_phone
    ),
    now(),
    now()
  );

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
    admin_uid,
    admin_uid,
    jsonb_build_object('sub', admin_uid::text, 'email', req.admin_email),
    'email',
    admin_uid::text,
    now(),
    now(),
    now()
  );

  -- 8. Update request status
  update public.society_requests
  set status = 'approved'
  where id = req_id;

  return new_soc_id;
end;
$$;

-- =======================================================
-- 7. PRE-SEEDED SYSTEM ACCOUNTS
-- =======================================================

-- Seed Master Admin dynamically using a PL/pgSQL block to avoid email collisions
do $$
declare
  admin_uid uuid;
begin
  -- Retrieve existing user ID or use the default one if not found
  select id into admin_uid from auth.users where email = 'societysync5@gmail.com';

  if admin_uid is null then
    admin_uid := '482f1c5a-4c26-4483-8f5f-b4feb384500a';
    
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
      admin_uid,
      'authenticated',
      'authenticated',
      'societysync5@gmail.com',
      '$2b$10$XUA5HFssRhGTLaTrDVVh2uBissBFiGZR2yJDFG0IoNQfNnJoTPUL.',
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Master Admin"}',
      now(),
      now()
    );

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
      admin_uid,
      admin_uid,
      jsonb_build_object('sub', admin_uid::text, 'email', 'societysync5@gmail.com'),
      'email',
      admin_uid::text,
      now(),
      now(),
      now()
    );
  end if;

  -- Create or update the profiles table entry
  insert into public.profiles (
    id,
    email,
    role,
    society_id,
    full_name,
    wing,
    flat_number,
    status,
    approved_at
  ) values (
    admin_uid,
    'societysync5@gmail.com',
    'master_admin',
    null,
    'Master Admin',
    'HQ',
    'Admin',
    'approved',
    now()
  ) on conflict (id) do update
  set role = 'master_admin', status = 'approved', approved_at = now();
end;
$$;
