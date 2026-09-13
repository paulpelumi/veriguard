-- Phase 5: billing, usage tracking, API access, WhatsApp sessions, the
-- Product Safety Index, NAFDAC partnership audit log, and a platform-wide
-- audit_log table the spec assumed already existed from Phase 3 - it
-- doesn't (checked: no migration anywhere creates one), so it's added
-- here rather than deferred to Module 7, which is the first module that
-- actually writes to it.
--
-- Four of this spec's own policies followed a pattern already found and
-- fixed elsewhere in this project (0015's own comment on nafdac_cache/
-- whatsapp_rate_limits): "Service role manages X" using (true) - the
-- service role bypasses RLS by definition and needs no policy at all,
-- while using (true) with no `to service_role` actually grants
-- unrestricted read/write to every anon/authenticated caller, the exact
-- opposite of the intent. Skipped on user_subscriptions, usage_records,
-- safety_index_data, and whatsapp_sessions - all four are written
-- exclusively by service-role server code anyway (webhooks, usage
-- tracking, the aggregator function), so nothing loses access by leaving
-- them out.

create table if not exists public.subscription_plans (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  role text not null check (role in ('consumer', 'business', 'manufacturer')),
  tier text not null,
  price_monthly_kobo integer not null default 0,
  price_yearly_kobo integer not null default 0,
  features jsonb not null default '{}',
  limits jsonb not null default '{}',
  is_active boolean default true,
  paystack_plan_code text,
  created_at timestamptz default now()
);

alter table public.subscription_plans enable row level security;
create policy "Anyone can view active plans"
  on public.subscription_plans for select using (is_active);

insert into public.subscription_plans
  (name, role, tier, price_monthly_kobo, price_yearly_kobo, features, limits)
values
('Consumer Free', 'consumer', 'free', 0, 0,
  '{"verifications": true, "recall_alerts": true, "history": false,
    "family_accounts": false, "priority_alerts": false}',
  '{"monthly_verifications": 20, "saved_products": 5}'),
('Consumer Premium', 'consumer', 'premium', 150000, 1440000,
  '{"verifications": true, "recall_alerts": true, "history": true,
    "family_accounts": true, "priority_alerts": true}',
  '{"monthly_verifications": -1, "saved_products": -1}'),
('Business Starter', 'business', 'starter', 800000, 7680000,
  '{"inventory": true, "validator": true, "expiry_alerts": true,
    "recall_alerts": true, "reports": true, "analytics": false,
    "api_access": false, "multi_branch": false}',
  '{"inventory_items": 500, "users": 3, "monthly_verifications": -1}'),
('Business Professional', 'business', 'professional', 2500000, 24000000,
  '{"inventory": true, "validator": true, "expiry_alerts": true,
    "recall_alerts": true, "reports": true, "analytics": true,
    "api_access": true, "multi_branch": false}',
  '{"inventory_items": -1, "users": 10, "monthly_verifications": -1}'),
('Business Enterprise', 'business', 'enterprise', 0, 0,
  '{"inventory": true, "validator": true, "expiry_alerts": true,
    "recall_alerts": true, "reports": true, "analytics": true,
    "api_access": true, "multi_branch": true, "white_label": true}',
  '{"inventory_items": -1, "users": -1, "monthly_verifications": -1}'),
('Manufacturer Pilot', 'manufacturer', 'pilot', 0, 0,
  '{"code_generation": true, "all_export_formats": true,
    "duplicate_alerts": true, "analytics": true}',
  '{"monthly_codes": 1000000}'),
('Manufacturer Starter', 'manufacturer', 'starter', 1500000, 14400000,
  '{"code_generation": true, "all_export_formats": true,
    "duplicate_alerts": true, "analytics": true}',
  '{"monthly_codes": 500000}'),
('Manufacturer Professional', 'manufacturer', 'professional', 4000000, 38400000,
  '{"code_generation": true, "all_export_formats": true,
    "duplicate_alerts": true, "analytics": true, "priority_support": true}',
  '{"monthly_codes": 2000000}'),
('Manufacturer Enterprise', 'manufacturer', 'enterprise', 0, 0,
  '{"code_generation": true, "all_export_formats": true,
    "duplicate_alerts": true, "analytics": true, "priority_support": true,
    "dedicated_account_manager": true}',
  '{"monthly_codes": -1}')
on conflict (name) do nothing;

create table if not exists public.user_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  plan_id uuid references public.subscription_plans(id) not null,
  paystack_subscription_code text,
  paystack_customer_code text,
  paystack_authorization_code text,
  status text default 'active'
    check (status in ('active', 'cancelled', 'expired', 'paused', 'trial')),
  billing_cycle text default 'monthly'
    check (billing_cycle in ('monthly', 'yearly')),
  current_period_start timestamptz default now(),
  current_period_end timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on public.user_subscriptions(user_id);
create index on public.user_subscriptions(status);
alter table public.user_subscriptions enable row level security;
create policy "Users view own subscriptions"
  on public.user_subscriptions for select using (auth.uid() = user_id);

create table if not exists public.usage_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  metric text not null check (metric in (
    'verifications', 'inventory_items', 'serial_codes_generated',
    'api_calls', 'whatsapp_queries', 'report_exports'
  )),
  count integer not null default 1,
  period_month integer not null,
  period_year integer not null,
  created_at timestamptz default now(),
  unique(user_id, metric, period_month, period_year)
);

create index on public.usage_records(user_id, period_month, period_year);
alter table public.usage_records enable row level security;
create policy "Users view own usage"
  on public.usage_records for select using (auth.uid() = user_id);

create table if not exists public.payment_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  subscription_id uuid references public.user_subscriptions(id),
  paystack_reference text unique not null,
  paystack_transaction_id text,
  amount_kobo integer not null,
  currency text default 'NGN',
  status text not null check (status in (
    'success', 'failed', 'pending', 'refunded'
  )),
  description text,
  metadata jsonb,
  paid_at timestamptz,
  created_at timestamptz default now()
);

create index on public.payment_history(user_id);
create index on public.payment_history(paystack_reference);
alter table public.payment_history enable row level security;
create policy "Users view own payments"
  on public.payment_history for select using (auth.uid() = user_id);

create table if not exists public.api_keys (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  key_hash text not null unique,
  key_prefix text not null,
  permissions text[] default '{"verify"}',
  rate_limit_per_hour integer default 100,
  calls_today integer default 0,
  calls_total integer default 0,
  last_used_at timestamptz,
  expires_at timestamptz,
  is_active boolean default true,
  created_at timestamptz default now()
);

create index on public.api_keys(user_id);
create index on public.api_keys(key_hash);
alter table public.api_keys enable row level security;
create policy "Users manage own API keys"
  on public.api_keys for all using (auth.uid() = user_id);

create table if not exists public.safety_index_data (
  id uuid default gen_random_uuid() primary key,
  period_month integer,
  period_year integer not null,
  metric_name text not null,
  metric_value numeric not null,
  breakdown jsonb,
  computed_at timestamptz default now(),
  unique(period_year, period_month, metric_name)
);

alter table public.safety_index_data enable row level security;
create policy "Anyone can view safety index data"
  on public.safety_index_data for select using (true);

create table if not exists public.whatsapp_sessions (
  id uuid default gen_random_uuid() primary key,
  phone_number text not null unique,
  user_id uuid references public.profiles(id),
  language text default 'en'
    check (language in ('en', 'pidgin', 'yoruba', 'hausa', 'igbo')),
  last_message_at timestamptz default now(),
  message_count integer default 0,
  monthly_count integer default 0,
  monthly_reset_at timestamptz default now(),
  is_blocked boolean default false,
  context jsonb default '{}',
  created_at timestamptz default now()
);

create index on public.whatsapp_sessions(phone_number);
alter table public.whatsapp_sessions enable row level security;

create table if not exists public.nafdac_api_audit (
  id uuid default gen_random_uuid() primary key,
  endpoint text not null,
  request_params jsonb,
  response_summary jsonb,
  records_returned integer,
  requested_at timestamptz default now(),
  requester_ip text,
  requester_org text
);

alter table public.nafdac_api_audit enable row level security;
create policy "Admin only can view API audit"
  on public.nafdac_api_audit for select
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ));

-- Not part of the spec's own SQL block - it assumed this table already
-- existed from Phase 3. Written exclusively by service-role server code
-- (lib/security/audit-logger.ts, Module 7), so only a read policy is
-- needed; admins browse it, nobody else can.
create table if not exists public.audit_log (
  id uuid default gen_random_uuid() primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_table text,
  target_id text,
  details jsonb,
  created_at timestamptz default now()
);

create index on public.audit_log(actor_id);
create index on public.audit_log(action);
create index on public.audit_log(created_at);

alter table public.audit_log enable row level security;
create policy "Admin can view audit log"
  on public.audit_log for select
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ));
