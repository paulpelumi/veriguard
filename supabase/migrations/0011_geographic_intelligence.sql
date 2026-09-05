-- Phase 3, Module 6: Geographic Intelligence Layer.
alter table public.verification_logs
  add column if not exists user_state text,
  add column if not exists user_lga text;

create table public.geographic_stats (
  id uuid default gen_random_uuid() primary key,
  state text not null,
  period_date date not null,
  verification_count integer default 0,
  counterfeit_reports integer default 0,
  not_found_count integer default 0,
  anomaly_count integer default 0,
  updated_at timestamptz default now(),
  unique(state, period_date)
);

create index on public.geographic_stats(state);
create index on public.geographic_stats(period_date desc);

alter table public.geographic_stats enable row level security;

-- Same reasoning as nafdac_cache/verification_anomalies: no write policy for
-- anon/authenticated at all - only the geo-aggregator Edge Function (service
-- role) ever writes here, which bypasses RLS entirely by definition.
create policy "Admin can view geographic stats"
  on public.geographic_stats for select using (public.is_admin());

-- Needed for the intelligence page's hotspot panel (top-5 flagged numbers
-- and product categories) and for computing which states have an active
-- anomaly right now - both require reading across ALL users' rows, not just
-- the admin's own. verification_logs and counterfeit_reports previously had
-- no "admin can see everything" policy (only "own rows" ones), which is
-- exactly right for a regular user but too narrow for the admin dashboard.
-- Module 7's admin reports/users pages will lean on these same policies.
create policy "Admin can view all verification logs"
  on public.verification_logs for select using (public.is_admin());

create policy "Admin can view all counterfeit reports"
  on public.counterfeit_reports for select using (public.is_admin());

-- Aggregation helpers for geo-aggregator (the daily Edge Function) and for
-- the intelligence page's live "active anomaly" state coloring. Plain
-- invoker-rights functions, not security definer - the service role bypasses
-- RLS regardless, and an admin's own session now has full read access via
-- the policies above, so nothing here needs elevated privilege. A
-- non-admin, non-service caller would just get their own rows back, same
-- safe-by-construction reasoning as Module 4's anomaly_frequency_stats.
create or replace function public.geo_verification_stats(p_since timestamptz, p_until timestamptz)
returns table (state text, verification_count bigint, not_found_count bigint)
language sql stable
as $$
  select
    coalesce(v.user_state, p.state) as state,
    count(*) as verification_count,
    count(*) filter (where v.verification_status = 'not_found') as not_found_count
  from public.verification_logs v
  join public.profiles p on p.id = v.user_id
  where v.created_at >= p_since and v.created_at < p_until
    and coalesce(v.user_state, p.state) is not null
  group by coalesce(v.user_state, p.state);
$$;

create or replace function public.geo_counterfeit_report_stats(p_since timestamptz, p_until timestamptz)
returns table (state text, report_count bigint)
language sql stable
as $$
  select state, count(*) as report_count
  from public.counterfeit_reports
  where created_at >= p_since and created_at < p_until and state is not null
  group by state;
$$;

-- Feeds geographic_stats.anomaly_count: how many of today's verifications
-- from a given state touched a NAFDAC number that currently has an
-- unresolved anomaly on record.
create or replace function public.geo_anomaly_state_touches(p_since timestamptz, p_until timestamptz)
returns table (state text, anomaly_touch_count bigint)
language sql stable
as $$
  select coalesce(v.user_state, p.state) as state, count(*) as anomaly_touch_count
  from public.verification_logs v
  join public.profiles p on p.id = v.user_id
  join public.verification_anomalies a on a.nafdac_number = v.nafdac_number and a.is_resolved = false
  where v.created_at >= p_since and v.created_at < p_until
    and coalesce(v.user_state, p.state) is not null
  group by coalesce(v.user_state, p.state);
$$;

-- Used live by the intelligence page for the map's "pulsing red" indicator -
-- fresher than the daily geographic_stats.anomaly_count rollup, since an
-- anomaly's relevance to "right now" matters more than yesterday's count.
create or replace function public.active_anomaly_states(p_since timestamptz)
returns table (state text)
language sql stable
as $$
  select distinct coalesce(v.user_state, p.state) as state
  from public.verification_anomalies a
  join public.verification_logs v on v.nafdac_number = a.nafdac_number
  join public.profiles p on p.id = v.user_id
  where a.is_resolved = false
    and v.created_at >= p_since
    and coalesce(v.user_state, p.state) is not null;
$$;
