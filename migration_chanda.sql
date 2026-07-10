-- SocietySync Chanda Collection Module Schema Setup
-- Run this inside your Supabase SQL Editor.

-- 1. CREATE CORE TABLES
create table if not exists public.wings (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies(id) on delete cascade,
  name text not null, -- e.g. 'Wing A', 'Wing B'
  collector_user_id uuid references public.profiles(id) on delete set null,
  collector_upi_id text,
  collector_name text,
  collector_phone text,
  created_at timestamp with time zone default now(),
  unique(society_id, name)
);

create table if not exists public.flats (
  id uuid primary key default gen_random_uuid(),
  wing_id uuid not null references public.wings(id) on delete cascade,
  flat_number text not null, -- e.g. '101', '102'
  created_at timestamp with time zone default now(),
  unique(wing_id, flat_number)
);

create table if not exists public.chanda_campaigns (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies(id) on delete cascade,
  title text not null,
  description text,
  target_amount numeric(12,2),
  suggested_amount numeric(12,2),
  min_amount numeric(12,2) default 1,
  start_date date not null,
  end_date date,
  status text not null default 'draft' check (status in ('draft','active','closed','cancelled')),
  amount_type text not null default 'flexible' check (amount_type in ('fixed','flexible')),
  wing_targets jsonb, -- { "<wing_id>": target_amount }
  banner_url text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.chanda_payments (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.chanda_campaigns(id) on delete cascade,
  society_id uuid not null references public.societies(id) on delete cascade,
  wing_id uuid not null references public.wings(id) on delete cascade,
  flat_id uuid references public.flats(id) on delete set null,
  resident_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'INR',
  razorpay_order_id text not null unique,
  razorpay_payment_id text unique,
  razorpay_signature text,
  status text not null default 'created' check (status in ('created','pending','paid','failed','refunded')),
  receipt_number text unique,
  receipt_url text,
  receipt_generated_at timestamp with time zone,
  paid_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.chanda_webhook_events (
  id uuid primary key default gen_random_uuid(),
  razorpay_event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  processed boolean not null default false,
  received_at timestamp with time zone default now()
);

create table if not exists public.chanda_offline_contributions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.chanda_campaigns(id) on delete cascade,
  society_id uuid not null references public.societies(id) on delete cascade,
  wing_id uuid not null references public.wings(id) on delete cascade,
  flat_id uuid references public.flats(id) on delete set null,
  resident_id uuid references public.profiles(id) on delete set null,
  payer_name text,
  amount numeric(12,2) not null check (amount > 0),
  collection_mode text not null default 'upi' check (collection_mode in ('upi','cash','bank_transfer','other')),
  collector_upi_id text,
  upi_reference_id text,
  proof_url text,
  collected_at date not null,
  entered_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending_verification' check (status in ('pending_verification','verified','rejected')),
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamp with time zone,
  rejection_reason text,
  receipt_number text unique,
  receipt_url text,
  created_at timestamp with time zone default now()
);

create table if not exists public.chanda_campaign_audit (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.chanda_campaigns(id) on delete cascade,
  changed_by uuid not null references public.profiles(id) on delete cascade,
  changed_fields jsonb not null,
  changed_at timestamp with time zone default now()
);

-- CREATE INDEXES
create index if not exists idx_chanda_payments_campaign on public.chanda_payments(campaign_id);
create index if not exists idx_chanda_payments_wing on public.chanda_payments(wing_id);
create index if not exists idx_chanda_payments_society on public.chanda_payments(society_id);
create index if not exists idx_chanda_payments_status on public.chanda_payments(status);
create index if not exists idx_chanda_offline_campaign on public.chanda_offline_contributions(campaign_id);
create index if not exists idx_chanda_offline_wing on public.chanda_offline_contributions(wing_id);

-- 2. ENABLE ROW LEVEL SECURITY
alter table public.wings enable row level security;
alter table public.flats enable row level security;
alter table public.chanda_campaigns enable row level security;
alter table public.chanda_payments enable row level security;
alter table public.chanda_offline_contributions enable row level security;
alter table public.chanda_campaign_audit enable row level security;
alter table public.chanda_webhook_events enable row level security;

-- 3. RLS POLICIES

-- Wings: read access for anyone in the same society, write for admins
create policy wings_read_all on public.wings
  for select using (
    society_id = (select society_id from public.profiles where id = auth.uid())
  );
create policy wings_write_admin on public.wings
  for all using (
    society_id = (select society_id from public.profiles where id = auth.uid())
    and (select role from public.profiles where id = auth.uid()) in ('admin', 'master_admin')
  );

-- Flats: read access for anyone in the same society, write for admins
create policy flats_read_all on public.flats
  for select using (
    wing_id in (select id from public.wings where society_id = (select society_id from public.profiles where id = auth.uid()))
  );
create policy flats_write_admin on public.flats
  for all using (
    wing_id in (select id from public.wings where society_id = (select society_id from public.profiles where id = auth.uid()))
    and (select role from public.profiles where id = auth.uid()) in ('admin', 'master_admin')
  );

-- Campaigns: admins get full control
create policy chanda_campaigns_admin on public.chanda_campaigns
  for all using (
    society_id = (select society_id from public.profiles where id = auth.uid())
    and (select role from public.profiles where id = auth.uid()) in ('admin', 'master_admin')
  );
-- Campaigns: residents can view active ones
create policy chanda_campaigns_resident_read on public.chanda_campaigns
  for select using (
    society_id = (select society_id from public.profiles where id = auth.uid())
    and status = 'active'
  );

-- Payments: residents can view/insert their own
create policy chanda_payments_resident on public.chanda_payments
  for select using (resident_id = auth.uid());
create policy chanda_payments_resident_insert on public.chanda_payments
  for insert with check (
    resident_id = auth.uid()
    and society_id = (select society_id from public.profiles where id = auth.uid())
  );
-- Payments: admins view all
create policy chanda_payments_admin_read on public.chanda_payments
  for select using (
    society_id = (select society_id from public.profiles where id = auth.uid())
    and (select role from public.profiles where id = auth.uid()) in ('admin', 'master_admin')
  );

-- Offline contributions: collectors view/insert own wing entries
create policy chanda_offline_collector_insert on public.chanda_offline_contributions
  for insert with check (
    entered_by = auth.uid()
    and wing_id in (select id from public.wings where collector_user_id = auth.uid())
  );
create policy chanda_offline_collector_read on public.chanda_offline_contributions
  for select using (
    wing_id in (select id from public.wings where collector_user_id = auth.uid())
  );
-- Offline contributions: admins full control
create policy chanda_offline_admin_all on public.chanda_offline_contributions
  for all using (
    society_id = (select society_id from public.profiles where id = auth.uid())
    and (select role from public.profiles where id = auth.uid()) in ('admin', 'master_admin')
  );

-- 4. SETUP STORAGE BUCKETS
insert into storage.buckets (id, name, public) values ('chanda-receipts', 'chanda-receipts', true) on conflict (id) do nothing;
