-- Admin-managed GS1 Nigeria company-prefix registry, used to cross-check a
-- scanned EAN-13 barcode's manufacturer against the NAFDAC-registered
-- company for the same product.
create table public.gs1_prefixes (
  id uuid default gen_random_uuid() primary key,
  prefix text unique not null,
  company_name text not null,
  country_code text default 'NG',
  is_verified boolean default true,
  created_at timestamptz default now()
);

create index on public.gs1_prefixes(prefix);

-- Seed with known Nigerian manufacturers (grows over time as VeriGuard
-- encounters more products - see the admin GS1 database page in Module 7).
insert into public.gs1_prefixes (prefix, company_name) values
  ('6151234', 'Nestlé Nigeria Plc'),
  ('6155678', 'Nigerian Bottling Company Ltd'),
  ('6159012', 'Unilever Nigeria Plc'),
  ('6153456', 'De United Foods Industries Ltd'),
  ('6157890', 'GlaxoSmithKline Consumer Nigeria Plc'),
  ('6152345', 'FrieslandCampina WAMCO Nigeria Plc'),
  ('6156789', 'Reckitt Benckiser Nigeria Ltd'),
  ('6150123', 'Procter & Gamble Nigeria Ltd');

alter table public.gs1_prefixes enable row level security;

create policy "Anyone can read GS1 prefixes"
  on public.gs1_prefixes for select using (true);

-- The spec's original policy for this table used
-- `auth.jwt() ->> 'role' = 'admin'` - this doesn't do what it looks like it
-- does. Supabase's JWT `role` claim is the Postgres role (anon/authenticated/
-- service_role), not the app-level `profiles.role` column, so this check
-- would never be true for an actual admin user. The same mistake appears
-- in the Module 4 (verification_anomalies) and Module 7 (admin routes) spec
-- text - fixing it once here with a reusable helper rather than repeating
-- the bug three times.
--
-- is_admin() checks profiles.role directly instead. It's safe to create
-- now even though 'admin' isn't yet a valid profiles.role value (Module 7
-- adds it) - until then this simply matches nobody, which is the correct
-- default: no one should be able to write to this table before the admin
-- role actually exists.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create policy "Admin only can manage GS1 prefixes"
  on public.gs1_prefixes for all using (public.is_admin());
