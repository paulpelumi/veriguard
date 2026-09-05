-- NAFDAC verification cache.
create table public.nafdac_cache (
  id uuid default gen_random_uuid() primary key,
  nafdac_number text unique not null,
  product_name text not null,
  company_name text not null,
  product_category text not null,
  registration_status text not null,
  additional_info jsonb,
  source text default 'live' check (source in ('live', 'manual')),
  last_verified_at timestamptz default now(),
  verification_count integer default 1,
  created_at timestamptz default now()
);

create index on public.nafdac_cache(nafdac_number);
create index on public.nafdac_cache(last_verified_at);

alter table public.nafdac_cache enable row level security;

-- Reads are public (this is non-sensitive product registry data everyone
-- benefits from, cached to reduce NAFDAC portal load).
create policy "Anyone can read nafdac cache"
  on public.nafdac_cache for select using (true);

-- Deliberately NO insert/update policy for authenticated/anon here.
-- The spec's original SQL used `using (true)` with no role restriction for
-- a "service role can manage" policy - but that comment doesn't match what
-- the SQL actually does: an unrestricted `using (true)` policy grants that
-- access to every role RLS applies to (anon and authenticated), not just
-- the service role. The service role bypasses RLS entirely by definition,
-- so it needs no policy at all. Writes go through the two security-definer
-- functions below instead, which run with elevated privilege regardless of
-- the caller's row-level permissions - this keeps the service role key out
-- of the app runtime for this feature entirely.
create or replace function public.upsert_nafdac_cache(
  p_nafdac_number text,
  p_product_name text,
  p_company_name text,
  p_product_category text,
  p_registration_status text,
  p_additional_info jsonb,
  p_source text default 'live'
)
returns public.nafdac_cache
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.nafdac_cache;
begin
  insert into public.nafdac_cache (
    nafdac_number, product_name, company_name, product_category,
    registration_status, additional_info, source, last_verified_at, verification_count
  )
  values (
    p_nafdac_number, p_product_name, p_company_name, p_product_category,
    p_registration_status, p_additional_info, p_source, now(), 1
  )
  on conflict (nafdac_number) do update set
    product_name = excluded.product_name,
    company_name = excluded.company_name,
    product_category = excluded.product_category,
    registration_status = excluded.registration_status,
    additional_info = excluded.additional_info,
    source = excluded.source,
    last_verified_at = now(),
    verification_count = public.nafdac_cache.verification_count + 1
  returning * into result;

  return result;
end;
$$;

grant execute on function public.upsert_nafdac_cache to authenticated;

create or replace function public.increment_nafdac_cache_hit(p_nafdac_number text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.nafdac_cache
  set verification_count = verification_count + 1
  where nafdac_number = p_nafdac_number;
$$;

grant execute on function public.increment_nafdac_cache_hit to authenticated;

-- Scrape attempt log. Low-sensitivity operational telemetry (no user_id
-- column - it's about NAFDAC numbers, not people), so a direct insert/select
-- policy for authenticated users is fine here, unlike nafdac_cache above.
create table public.scrape_logs (
  id uuid default gen_random_uuid() primary key,
  nafdac_number text not null,
  attempt_number integer not null,
  result text not null check (result in ('success', 'timeout', 'not_found', 'parse_error', 'network_error')),
  response_time_ms integer,
  used_cache boolean default false,
  created_at timestamptz default now()
);

create index on public.scrape_logs(nafdac_number);
create index on public.scrape_logs(created_at desc);

alter table public.scrape_logs enable row level security;
create policy "Authenticated users can log scrape attempts"
  on public.scrape_logs for insert
  with check (auth.role() = 'authenticated');
create policy "Authenticated users can read scrape logs"
  on public.scrape_logs for select
  using (auth.role() = 'authenticated');
