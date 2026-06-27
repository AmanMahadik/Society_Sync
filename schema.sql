-- SocietySync Ultimate Database Schema Setup
-- Run this in your Supabase SQL Editor
-- This database contains only structural seed data (no dummy/test transactions, dues, or residents)

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE (extends Supabase auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  flat_number text,
  wing text,
  role text not null check (role in ('admin', 'owner', 'renter', 'guard')),
  society_name text,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  google_picture_url text,
  phone text,
  created_at timestamp with time zone default now(),
  approved_at timestamp with time zone,
  notification_token text -- For Expo Push Notifications
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- 2. EVENTS TABLE (Festival Ledger)
create table public.events (
  id bigint primary key generated always as identity,
  name text not null, -- e.g., 'Ganesh Chaturthi 2026'
  description text,
  event_date date,
  total_income decimal(12,2) default 0.00,
  total_expense decimal(12,2) default 0.00,
  balance decimal(12,2) generated always as (total_income - total_expense) stored,
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default now(),
  is_active boolean default true
);

-- Enable RLS on events
alter table public.events enable row level security;

-- 3. TRANSACTIONS TABLE (Income & Expense Entries)
create table public.transactions (
  id bigint primary key generated always as identity,
  event_id bigint references public.events(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  category text not null, -- e.g., 'Chandaa', 'Pandal', 'Sound System'
  amount decimal(12,2) not null,
  description text,
  bill_image_url text, -- Supabase Storage URL
  recorded_by uuid references public.profiles(id),
  recorded_at timestamp with time zone default now()
);

-- Enable RLS on transactions
alter table public.transactions enable row level security;

-- 4. MAINTENANCE DUES TABLE
create table public.maintenance_dues (
  id bigint primary key generated always as identity,
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
  unique(wing, flat_number, month)
);

-- Enable RLS on maintenance_dues
alter table public.maintenance_dues enable row level security;

-- 5. PARKING SLOTS TABLE
create table public.parking_slots (
  id bigint primary key generated always as identity,
  slot_number text not null unique check (slot_number like 'V%'), -- V1 to V10
  is_available boolean default true,
  created_at timestamp with time zone default now()
);

-- Enable RLS on parking_slots
alter table public.parking_slots enable row level security;

-- 6. PARKING REQUESTS TABLE
create table public.parking_requests (
  id bigint primary key generated always as identity,
  user_id uuid references public.profiles(id) on delete cascade,
  slot_id bigint references public.parking_slots(id) on delete cascade,
  date date not null,
  time_slot text not null check (time_slot in ('morning', 'afternoon', 'evening', 'overnight')),
  vehicle_number text not null,
  visitor_name text,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected', 'completed')),
  created_at timestamp with time zone default now(),
  approved_at timestamp with time zone,
  approved_by uuid references public.profiles(id)
);

-- Enable RLS on parking_requests
alter table public.parking_requests enable row level security;

-- 7. SOS COMPLAINTS TABLE (SOS alerts)
create table public.complaints (
  id bigint primary key generated always as identity,
  user_id uuid references public.profiles(id) on delete cascade,
  type text not null check (type in ('water_low', 'motor_off', 'electricity', 'security', 'other')),
  wing text not null,
  flat_number text not null,
  description text,
  status text default 'pending' check (status in ('pending', 'acknowledged', 'resolved', 'ignored')),
  priority text default 'high' check (priority in ('low', 'medium', 'high', 'emergency')),
  acknowledged_by uuid references public.profiles(id),
  acknowledged_at timestamp with time zone,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Enable RLS on complaints
alter table public.complaints enable row level security;

-- 8. CHAT THREADS TABLE (Society Council)
create table public.chat_threads (
  id bigint primary key generated always as identity,
  title text not null,
  category text not null check (category in ('water-infrastructure', 'budget', 'events', 'maintenance', 'security', 'general')),
  created_by uuid references public.profiles(id),
  is_archived boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS on chat_threads
alter table public.chat_threads enable row level security;

-- 9. CHAT MESSAGES TABLE
create table public.chat_messages (
  id bigint primary key generated always as identity,
  thread_id bigint references public.chat_threads(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  content text not null,
  is_pinned boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS on chat_messages
alter table public.chat_messages enable row level security;

-- 10. USER APPROVALS TABLE (Admin tracking)
create table public.user_approvals (
  id bigint primary key generated always as identity,
  user_id uuid references public.profiles(id) on delete cascade,
  approved_by uuid references public.profiles(id),
  status text not null check (status in ('approved', 'rejected')),
  reason text,
  created_at timestamp with time zone default now(),
  resolved_at timestamp with time zone default now()
);

-- Enable RLS on user_approvals
alter table public.user_approvals enable row level security;

-- 11. NOTIFICATIONS TABLE
create table public.notifications (
  id bigint primary key generated always as identity,
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  data jsonb,
  is_read boolean default false,
  created_at timestamp with time zone default now()
);

-- Enable RLS on notifications
alter table public.notifications enable row level security;

-- 12. SOCIETY SETTINGS TABLE
create table public.society_settings (
  id bigint primary key generated always as identity,
  society_name text not null unique,
  address text,
  maintenance_rate_per_sqft decimal(10,2) default 3.50,
  late_fee_percentage decimal(5,2) default 2.00,
  parking_slot_count int default 10,
  admin_contact text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS on society_settings
alter table public.society_settings enable row level security;

-- 13. VOTING POLLS TABLE
create table public.polls (
  id bigint primary key generated always as identity,
  title text not null,
  description text,
  thread_id bigint references public.chat_threads(id) on delete cascade,
  created_by uuid references public.profiles(id),
  expires_at timestamp with time zone,
  status text default 'active' check (status in ('active', 'closed')),
  created_at timestamp with time zone default now()
);

-- Enable RLS on polls
alter table public.polls enable row level security;

-- 14. POLL OPTIONS TABLE
create table public.poll_options (
  id bigint primary key generated always as identity,
  poll_id bigint references public.polls(id) on delete cascade,
  option_text text not null,
  vote_count int default 0,
  created_at timestamp with time zone default now()
);

-- Enable RLS on poll_options
alter table public.poll_options enable row level security;

-- 15. POLL VOTES TABLE
create table public.poll_votes (
  id bigint primary key generated always as identity,
  poll_id bigint references public.polls(id) on delete cascade,
  option_id bigint references public.poll_options(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  voted_at timestamp with time zone default now(),
  unique(poll_id, user_id) -- Each user can vote once per poll
);

-- Enable RLS on poll_votes
alter table public.poll_votes enable row level security;

--------------------------------------------------------------------------------
-- PERFORMANCE INDEXES
--------------------------------------------------------------------------------
create index idx_profiles_status on public.profiles(status);
create index idx_profiles_role on public.profiles(role);
create index idx_complaints_status on public.complaints(status);
create index idx_complaints_wing on public.complaints(wing);
create index idx_parking_requests_date on public.parking_requests(date);
create index idx_maintenance_dues_flat on public.maintenance_dues(flat_number);
create index idx_maintenance_dues_status on public.maintenance_dues(status);
create index idx_chat_messages_thread on public.chat_messages(thread_id);
create index idx_notifications_user on public.notifications(user_id);
create index idx_transactions_event on public.transactions(event_id);

--------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
--------------------------------------------------------------------------------

-- Helper functions
create or replace function public.is_user_approved(user_id uuid)
returns boolean security definer as $$
begin
  return exists (
    select 1 from public.profiles 
    where id = user_id and status = 'approved'
  );
end;
$$ language plpgsql;

create or replace function public.is_admin(user_id uuid)
returns boolean security definer as $$
begin
  return exists (
    select 1 from public.profiles 
    where id = user_id and role = 'admin'
  );
end;
$$ language plpgsql;

create or replace function public.is_guard(user_id uuid)
returns boolean security definer as $$
begin
  return exists (
    select 1 from public.profiles 
    where id = user_id and role = 'guard'
  );
end;
$$ language plpgsql;

-- Profiles Policies
create policy "Allow read of approved profiles" on public.profiles
  for select to authenticated using (true);

create policy "Allow users to update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id);

create policy "Admins can manage all profiles" on public.profiles
  for all to authenticated using (public.is_admin(auth.uid()));

-- Complaints Policies
create policy "Allow approved read complaints" on public.complaints
  for select to authenticated using (public.is_user_approved(auth.uid()));

create policy "Allow approved insert complaints" on public.complaints
  for insert to authenticated with check (public.is_user_approved(auth.uid()) and auth.uid() = user_id);

create policy "Allow guards/admins to update complaints" on public.complaints
  for update to authenticated using (public.is_user_approved(auth.uid()));

-- Events Policies
create policy "Allow approved read events" on public.events
  for select to authenticated using (public.is_user_approved(auth.uid()));

create policy "Allow admins to manage events" on public.events
  for all to authenticated using (public.is_admin(auth.uid()));

-- Transactions Policies
create policy "Allow approved read transactions" on public.transactions
  for select to authenticated using (public.is_user_approved(auth.uid()));

create policy "Allow admins to manage transactions" on public.transactions
  for all to authenticated using (public.is_admin(auth.uid()));

-- Maintenance Dues Policies
create policy "Allow approved read maintenance" on public.maintenance_dues
  for select to authenticated using (public.is_user_approved(auth.uid()));

create policy "Allow admins to manage maintenance" on public.maintenance_dues
  for all to authenticated using (public.is_admin(auth.uid()));

-- Parking Slots Policies
create policy "Allow approved read slots" on public.parking_slots
  for select to authenticated using (public.is_user_approved(auth.uid()));

create policy "Allow admins to manage slots" on public.parking_slots
  for all to authenticated using (public.is_admin(auth.uid()));

-- Parking Requests Policies
create policy "Allow approved read requests" on public.parking_requests
  for select to authenticated using (public.is_user_approved(auth.uid()));

create policy "Allow approved insert requests" on public.parking_requests
  for insert to authenticated with check (public.is_user_approved(auth.uid()) and auth.uid() = user_id);

create policy "Allow admins to manage requests" on public.parking_requests
  for all to authenticated using (public.is_admin(auth.uid()));

create policy "Allow guards to update requests" on public.parking_requests
  for update to authenticated using (public.is_guard(auth.uid()));

-- Chat Threads Policies
create policy "Allow approved read threads" on public.chat_threads
  for select to authenticated using (public.is_user_approved(auth.uid()));

create policy "Allow approved/owners/admins to manage threads" on public.chat_threads
  for all to authenticated using (public.is_user_approved(auth.uid()));

-- Chat Messages Policies
create policy "Allow approved read messages" on public.chat_messages
  for select to authenticated using (public.is_user_approved(auth.uid()));

create policy "Allow owners and admins to insert messages" on public.chat_messages
  for insert to authenticated with check (
    public.is_user_approved(auth.uid()) 
    and auth.uid() = user_id
    and exists (
      select 1 from public.profiles 
      where id = auth.uid() and (role = 'owner' or role = 'admin')
    )
  );

create policy "Allow admins to delete messages" on public.chat_messages
  for delete to authenticated using (public.is_admin(auth.uid()));

-- Polls, Options, and Votes Policies
create policy "Allow approved read polls" on public.polls for select to authenticated using (public.is_user_approved(auth.uid()));
create policy "Allow owners/admins to manage polls" on public.polls for all to authenticated using (public.is_user_approved(auth.uid()));

create policy "Allow approved read poll options" on public.poll_options for select to authenticated using (public.is_user_approved(auth.uid()));
create policy "Allow owners/admins to manage poll options" on public.poll_options for all to authenticated using (public.is_user_approved(auth.uid()));

create policy "Allow approved read votes" on public.poll_votes for select to authenticated using (public.is_user_approved(auth.uid()));
create policy "Allow approved insert votes" on public.poll_votes for insert to authenticated with check (public.is_user_approved(auth.uid()) and auth.uid() = user_id);

-- Society Settings Policies
create policy "Allow approved read settings" on public.society_settings for select to authenticated using (public.is_user_approved(auth.uid()));
create policy "Allow admins to manage settings" on public.society_settings for all to authenticated using (public.is_admin(auth.uid()));

-- Notifications Policies
create policy "Allow users to read own notifications" on public.notifications for select to authenticated using (auth.uid() = user_id);
create policy "Allow authenticated users to insert notifications" on public.notifications for insert to authenticated with check (true);
create policy "Allow users to update own notifications" on public.notifications for update to authenticated using (auth.uid() = user_id);


--------------------------------------------------------------------------------
-- AUTO-PROFILE SYNC TRIGGER ON SIGN UP
--------------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger as $$
declare
    default_role text := 'renter';
    default_status text := 'pending';
    user_count int;
begin
    -- Check if this is the first user in the database
    select count(*) into user_count from public.profiles;
    
    if user_count = 0 then
        -- The first user automatically becomes approved Admin
        default_role := 'admin';
        default_status := 'approved';
    else
        -- Check metadata for role selection from sign up form
        default_role := coalesce(new.raw_user_meta_data->>'role', 'renter');
        default_status := 'pending';
    end if;

    -- CRITICAL REQUIREMENT: societysync5@gmail.com is ALWAYS treated as Admin and approved instantly
    if new.email = 'societysync5@gmail.com' then
        default_role := 'admin';
        default_status := 'approved';
    end if;

    insert into public.profiles (
        id, 
        email,
        full_name, 
        role, 
        flat_number, 
        wing, 
        phone,
        society_name,
        status,
        google_picture_url,
        approved_at
    )
    values (
        new.id,
        new.email,
        coalesce(
            new.raw_user_meta_data->>'full_name', 
            new.raw_user_meta_data->>'name', 
            'New Resident'
        ),
        default_role,
        coalesce(
            new.raw_user_meta_data->>'flat_number', 
            case when new.email = 'societysync5@gmail.com' then 'Admin' else '' end
        ),
        coalesce(
            new.raw_user_meta_data->>'wing', 
            case when new.email = 'societysync5@gmail.com' then 'Admin' else '' end
        ),
        coalesce(
            new.raw_user_meta_data->>'phone', 
            new.raw_user_meta_data->>'phone_number', 
            ''
        ),
        coalesce(
            new.raw_user_meta_data->>'society_name', 
            'SocietySync Co-Op Housing'
        ),
        default_status,
        coalesce(
            new.raw_user_meta_data->>'google_picture_url', 
            new.raw_user_meta_data->>'avatar_url', 
            new.raw_user_meta_data->>'picture', 
            ''
        ),
        case when default_status = 'approved' then now() else null end
    );
    return new;
end;
$$ language plpgsql security definer;

-- Bind the trigger
create or replace trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

--------------------------------------------------------------------------------
-- ESSENTIAL STRUCTURAL SEED DATA (NO DUMMY RESIDENTS/TXS/DUES)
--------------------------------------------------------------------------------

-- Seed structural Chat Threads (empty of messages)
insert into public.chat_threads (title, category) values
('#Water-Infrastructure', 'water-infrastructure'),
('#Annual-Budget', 'budget'),
('#Ganesh-Planning', 'events'),
('#General-Complaints', 'general');

-- Seed structural Parking Slots V1 to V10 (needed for slot bookings to reference!)
insert into public.parking_slots (slot_number, is_available) values
('V1', true),
('V2', true),
('V3', true),
('V4', true),
('V5', true),
('V6', true),
('V7', true),
('V8', true),
('V9', true),
('V10', true);

-- Seed default society settings
insert into public.society_settings (society_name, address, maintenance_rate_per_sqft, late_fee_percentage, parking_slot_count)
values ('SocietySync Co-Op Housing', 'Ganesh Nagar, Pune, Maharashtra', 3.50, 2.00, 10);

-- MIGRATION: Add vehicle_number and bio to profiles table if they do not exist
alter table public.profiles add column if not exists vehicle_number text;
alter table public.profiles add column if not exists bio text;

--------------------------------------------------------------------------------
-- STORAGE BUCKETS & POLICIES SETUP
--------------------------------------------------------------------------------

-- 1. Create 'avatars' bucket (for user profile pictures)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 2. Create 'bills' bucket (for transaction receipt uploads)
insert into storage.buckets (id, name, public)
values ('bills', 'bills', true)
on conflict (id) do nothing;

-- RLS Policies for storage.objects:

-- Allow public read access to avatars and bills
create policy "Allow public read access to avatars"
on storage.objects for select
using ( bucket_id = 'avatars' );

create policy "Allow public read access to bills"
on storage.objects for select
using ( bucket_id = 'bills' );

-- Allow authenticated users to upload to avatars and bills
create policy "Allow authenticated users to upload avatars"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
);

create policy "Allow authenticated users to upload bills"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'bills'
);

-- Allow authenticated users to update/overwrite files in avatars and bills
create policy "Allow authenticated users to update avatars"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
);

create policy "Allow authenticated users to update bills"
on storage.objects for update
to authenticated
using (
  bucket_id = 'bills'
);

-- Account Deletion function executing as DB Administrator to clear user credentials
create or replace function public.delete_own_user()
returns void
language plpgsql
security definer
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

