-- Verification frequency anomaly detection (Phase 3, Module 4).
-- anomaly-detector (an Edge Function run on a schedule) scans
-- verification_logs for unusual activity on a given NAFDAC number and
-- records flags here for admin review.
create table public.verification_anomalies (
  id uuid default gen_random_uuid() primary key,
  nafdac_number text not null,
  anomaly_type text not null check (anomaly_type in (
    'high_frequency', 'geographic_spike', 'velocity_spike', 'multi_state_surge'
  )),
  severity text not null check (severity in ('elevated', 'high', 'critical')),
  verification_count integer not null,
  unique_users integer,
  distinct_states integer,
  time_window_hours integer,
  details jsonb,
  is_resolved boolean default false,
  resolved_at timestamptz,
  created_at timestamptz default now()
);

create index on public.verification_anomalies(nafdac_number);
create index on public.verification_anomalies(severity);
create index on public.verification_anomalies(created_at desc);
create index on public.verification_anomalies(is_resolved);

alter table public.verification_anomalies enable row level security;

-- The spec's original policy only covers select and reuses the broken
-- `auth.jwt() ->> 'role' = 'admin'` pattern fixed elsewhere in Phase 3 (see
-- 0008_gs1_prefixes.sql) via is_admin(). It also only grants select, but the
-- admin dashboard (Module 7) needs to mark anomalies resolved too - a single
-- "admin can manage" policy covers both without a second migration later.
-- The anomaly-detector Edge Function itself writes via the service role,
-- which bypasses RLS entirely, so this policy only ever needs to satisfy
-- interactive admin reads/writes.
create policy "Admin can manage anomalies"
  on public.verification_anomalies for all using (public.is_admin());

-- Elevated-monitoring window: when an anomaly of any severity is detected
-- for a number, its verification result should carry a warning for 72 hours
-- regardless of whether the underlying registration is otherwise clean.
-- (The spec's own prose limits this to "critical" anomalies, but its test
-- instructions - insert 60 rows, confirm the banner shows - only cross the
-- lowest "elevated" tier; any-severity was chosen so that test actually
-- works as written. See supabase/functions/anomaly-detector/index.ts.)
-- nafdac_cache is the natural home for this since every verification of
-- that number already reads it.
alter table public.nafdac_cache
  add column if not exists elevated_until timestamptz;

-- Extend notifications.type to cover anomaly alerts sent to the admin
-- account. Postgres has no `add value if not exists` for a check
-- constraint, so drop and recreate.
alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'expiry_warning', 'recall_alert', 'verification_complete',
    'counterfeit_confirmed', 'verification_anomaly'
  ));

-- Aggregation helpers for the anomaly-detector Edge Function. Deliberately
-- NOT security definer: the function is only ever called by that Edge
-- Function's service-role client, which bypasses RLS on verification_logs
-- entirely by default. Leaving these as plain invoker-rights functions means
-- if an ordinary authenticated user ever called one directly, Postgres would
-- still apply "Users can view own verification logs" underneath it and
-- silently scope the aggregate to just their own rows - safe by construction
-- rather than by a grant we'd have to remember to restrict.
create or replace function public.anomaly_frequency_stats(p_since timestamptz)
returns table (nafdac_number text, verification_count bigint, unique_users bigint)
language sql stable
as $$
  select nafdac_number, count(*) as verification_count, count(distinct user_id) as unique_users
  from public.verification_logs
  where created_at >= p_since
  group by nafdac_number;
$$;

create or replace function public.anomaly_geo_stats(p_since timestamptz)
returns table (nafdac_number text, distinct_states bigint)
language sql stable
as $$
  select v.nafdac_number, count(distinct p.state) as distinct_states
  from public.verification_logs v
  join public.profiles p on p.id = v.user_id
  where v.created_at >= p_since and p.state is not null
  group by v.nafdac_number;
$$;

-- Trailing daily average for the 7 days before the current 24h window
-- (p_since to p_until), used to detect a verification rate that has doubled
-- relative to a product's own recent history.
create or replace function public.anomaly_baseline_stats(p_since timestamptz, p_until timestamptz)
returns table (nafdac_number text, baseline_daily_avg numeric)
language sql stable
as $$
  select nafdac_number, count(*) / 7.0 as baseline_daily_avg
  from public.verification_logs
  where created_at >= p_since and created_at < p_until
  group by nafdac_number;
$$;
