-- VeriGuard initial schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).

-- Users (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  role text not null check (role in ('consumer', 'business')),
  business_name text,
  business_type text check (business_type in ('pharmacy', 'supermarket', 'food_retail', 'distributor', 'mall', 'other')),
  phone text,
  state text,
  lga text,
  subscription_tier text default 'free' check (subscription_tier in ('free', 'starter', 'professional', 'enterprise')),
  is_verified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Inventory (business users only)
create table public.inventory (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references public.profiles(id) on delete cascade not null,
  product_name text not null,
  product_type text not null check (product_type in ('food', 'drink', 'drug', 'cosmetic', 'herbal', 'medical_device', 'other')),
  product_subtype text,
  nafdac_number text,
  batch_number text,
  barcode text,
  production_date date,
  expiry_date date not null,
  quantity integer default 1,
  unit text default 'units',
  supplier text,
  purchase_price decimal(12,2),
  is_verified boolean default false,
  verification_status text default 'unverified' check (verification_status in ('verified', 'unverified', 'failed', 'pending')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- NAFDAC verification logs
create table public.verification_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  nafdac_number text not null,
  product_name text,
  company_name text,
  product_category text,
  verification_status text not null check (verification_status in ('verified', 'not_found', 'failed', 'error')),
  raw_response jsonb,
  source text default 'web' check (source in ('web', 'whatsapp', 'api')),
  created_at timestamptz default now()
);

-- Counterfeit reports
create table public.counterfeit_reports (
  id uuid default gen_random_uuid() primary key,
  reporter_id uuid references public.profiles(id) on delete set null,
  nafdac_number text,
  product_name text not null,
  product_type text,
  brand_name text,
  purchase_location text,
  state text,
  lga text,
  suspicion_reason text not null,
  description text,
  status text default 'pending' check (status in ('pending', 'reviewed', 'confirmed', 'dismissed')),
  created_at timestamptz default now()
);

-- Recall alerts
create table public.recall_alerts (
  id uuid default gen_random_uuid() primary key,
  nafdac_number text,
  product_name text not null,
  company_name text,
  recall_reason text,
  severity text check (severity in ('low', 'medium', 'high', 'critical')),
  issued_date date,
  source_url text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Indexes
create index idx_inventory_business_id on public.inventory(business_id);
create index idx_inventory_expiry_date on public.inventory(expiry_date);
create index idx_inventory_nafdac_number on public.inventory(nafdac_number);
create index idx_verification_logs_user_id on public.verification_logs(user_id);
create index idx_profiles_role on public.profiles(role);

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.inventory enable row level security;
alter table public.verification_logs enable row level security;
alter table public.counterfeit_reports enable row level security;
alter table public.recall_alerts enable row level security;

-- RLS Policies
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Business can manage own inventory" on public.inventory for all using (auth.uid() = business_id);
create policy "Users can view own verification logs" on public.verification_logs for select using (auth.uid() = user_id);
create policy "Users can insert verification logs" on public.verification_logs for insert with check (auth.uid() = user_id);
create policy "Anyone can insert counterfeit reports" on public.counterfeit_reports for insert with check (true);
create policy "Users can view own reports" on public.counterfeit_reports for select using (auth.uid() = reporter_id);
create policy "Anyone can view active recalls" on public.recall_alerts for select using (is_active = true);

-- Auto-create a profile row whenever a new auth user signs up.
-- Reads role/full_name/business fields out of the signup call's `options.data`.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, business_name, business_type, phone, state, lga)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'role', 'consumer'),
    new.raw_user_meta_data->>'business_name',
    new.raw_user_meta_data->>'business_type',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'state',
    new.raw_user_meta_data->>'lga'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
