-- Phase 4, Module 0: Manufacturer Portal schema.
--
-- Several items from the spec's raw migration are skipped or adjusted here
-- after checking the actual current schema and this project's established
-- RLS conventions - see the comments at each point below for why.

-- profiles_role_check already allows 'manufacturer' (added in Phase 3
-- Module 7, migration 0012_admin_dashboard.sql) - nothing to do here.

-- manufacturer_profiles already has `company_name` (not null) and
-- `nafdac_manufacturer_code` (nullable) from Phase 2 - the spec's
-- `business_name` and re-added `nafdac_manufacturer_code` would just be a
-- confusing duplicate of an existing field, so they're omitted. Likewise
-- `created_at` already exists. `registration_document_url` (a single
-- generic document field) becomes effectively superseded by the two
-- specific certificate URLs below, but is left in place rather than
-- dropped - no destructive changes for a column nothing in this migration
-- requires removing.
alter table public.manufacturer_profiles
  add column if not exists cac_number text,
  add column if not exists product_categories text[] default '{}',
  add column if not exists production_volume_monthly integer,
  add column if not exists serialisation_level text default 'unit'
    check (serialisation_level in ('unit', 'carton', 'pallet', 'mixed')),
  add column if not exists state text,
  add column if not exists address text,
  add column if not exists phone text,
  add column if not exists website text,
  add column if not exists nafdac_certificate_url text,
  add column if not exists cac_certificate_url text,
  add column if not exists verification_status text default 'pending'
    check (verification_status in ('pending', 'auto_checking', 'pending_manual', 'approved', 'rejected')),
  add column if not exists auto_check_result jsonb,
  add column if not exists auto_checked_at timestamptz,
  add column if not exists manual_reviewed_by uuid references public.profiles(id),
  add column if not exists manual_reviewed_at timestamptz,
  add column if not exists rejection_reason text,
  add column if not exists subscription_tier text default 'pilot'
    check (subscription_tier in ('pilot', 'starter', 'professional', 'enterprise')),
  add column if not exists subscription_started_at timestamptz,
  add column if not exists monthly_unit_limit integer default 1000000,
  add column if not exists units_generated_this_month integer default 0,
  add column if not exists updated_at timestamptz default now();

-- manufacturer_profiles previously only had a public "Anyone can read"
-- select policy (Phase 3, migration 0006) - manufacturers had no way to
-- create or edit their own row at all, which Module 1's registration flow
-- needs. "Admin can view all" is skipped as redundant: the existing public
-- select policy already covers admins (and everyone else).
create policy "Manufacturers manage own profile"
  on public.manufacturer_profiles for all using (auth.uid() = id);

-- Machine specifications (Module 3) - brand new table, no existing
-- equivalent.
create table public.manufacturer_machines (
  id uuid default gen_random_uuid() primary key,
  manufacturer_id uuid references public.manufacturer_profiles(id) on delete cascade not null,
  machine_name text not null,
  machine_brand text not null,
  machine_model text,
  machine_category text not null check (machine_category in (
    'industrial_coder', 'label_printer', 'laser_coder', 'thermal_inkjet',
    'continuous_inkjet', 'thermal_transfer', 'direct_thermal', 'uv_inkjet', 'other'
  )),
  serialisation_level text not null check (serialisation_level in ('unit', 'carton', 'pallet')),
  units_per_hour integer,
  ai_detected_brand text,
  ai_detected_model text,
  ai_recommended_format text,
  ai_format_confidence integer,
  ai_format_reasoning text,
  ai_detected_at timestamptz,
  custom_format_notes text,
  is_primary boolean default false,
  created_at timestamptz default now()
);

create index on public.manufacturer_machines(manufacturer_id);
alter table public.manufacturer_machines enable row level security;
create policy "Manufacturers manage own machines"
  on public.manufacturer_machines for all using (auth.uid() = manufacturer_id);

-- serialised_products already has a public "Anyone can read" select policy
-- (Phase 3, migration 0006) covering every status including 'recalled' -
-- that's intentional (a recalled batch should still resolve when scanned,
-- just flagged as recalled, not disappear as if it never existed), so the
-- spec's narrower "status != 'recalled'" read policy is skipped as it would
-- only ever be redundant with (never more permissive than) the existing
-- one. "Manufacturers manage own batches" is new and needed - the existing
-- policy is select-only, and manufacturers need to create/edit their own.
alter table public.serialised_products
  add column if not exists machine_id uuid references public.manufacturer_machines(id),
  add column if not exists serialisation_level text default 'unit'
    check (serialisation_level in ('unit', 'carton', 'pallet')),
  add column if not exists units_per_carton integer,
  add column if not exists cartons_per_pallet integer,
  add column if not exists export_format text,
  add column if not exists export_count integer default 0,
  add column if not exists last_exported_at timestamptz,
  add column if not exists product_category text,
  add column if not exists product_image_url text,
  add column if not exists description text,
  add column if not exists storage_conditions text,
  add column if not exists country_of_origin text default 'Nigeria';

create policy "Manufacturers manage own batches"
  on public.serialised_products for all using (auth.uid() = manufacturer_id);

-- product_serials already has "Anyone can read product serials" (using
-- true) and no write policy at all (Phase 3) - writes only ever go through
-- record_serial_scan(), a security-definer function, deliberately. The
-- spec's restated "Anyone can read..." is an exact duplicate (skipped),
-- and its "Service role manages serials" using (true) is the same broken
-- pattern fixed elsewhere in this project (nafdac_cache, whatsapp_rate_limits,
-- etc.): the service role bypasses RLS by definition and needs no policy
-- at all, while `using (true)` with no `to service_role` actually grants
-- unrestricted write access to every anon/authenticated caller - the exact
-- opposite of the stated intent. Skipped entirely; Module 5's batch
-- generation writes will go through a security-definer function too.
alter table public.product_serials
  add column if not exists serialisation_level text default 'unit'
    check (serialisation_level in ('unit', 'carton', 'pallet')),
  add column if not exists carton_serial text,
  add column if not exists pallet_serial text,
  add column if not exists qr_payload text,
  add column if not exists signature text,
  add column if not exists is_flagged boolean default false,
  add column if not exists flag_reason text,
  add column if not exists duplicate_scan_count integer default 0;

create index if not exists idx_product_serials_batch_id on public.product_serials(batch_id);
create index if not exists idx_product_serials_serial_code on public.product_serials(serial_code);
create index if not exists idx_product_serials_status on public.product_serials(status);
create index if not exists idx_product_serials_is_flagged on public.product_serials(is_flagged);

alter table public.serial_scan_events
  add column if not exists user_agent text,
  add column if not exists is_duplicate boolean default false,
  add column if not exists duplicate_of uuid references public.serial_scan_events(id),
  add column if not exists auto_reported boolean default false;

-- Manufacturer-facing notifications reuse the existing notifications table
-- (profiles.role = 'manufacturer' accounts are still just rows in
-- `profiles`) rather than a second, parallel notifications system with its
-- own bell/panel/hook - the existing infrastructure (Module 4, Phase 3)
-- already does everything the spec's manufacturer_notifications table
-- would, for less code to maintain. Extending the type constraint instead
-- of creating a new table.
alter table public.notifications
  drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'expiry_warning', 'recall_alert', 'verification_complete', 'counterfeit_confirmed',
    'verification_anomaly', 'duplicate_detected', 'batch_scan_milestone',
    'verification_approved', 'verification_rejected', 'subscription_reminder'
  ));

-- Public key storage for the future per-manufacturer signing design (see
-- the pilot-key discussion for Module 1/5 - for now all signing uses one
-- shared VERIGUARD_PILOT_PRIVATE_KEY, but the table is created now so the
-- schema is ready). "Service role manages keys" is skipped for the same
-- reason as above - the registration flow's key storage will insert via
-- the service role, which needs no policy to do so.
create table public.manufacturer_keys (
  id uuid default gen_random_uuid() primary key,
  manufacturer_id uuid references public.manufacturer_profiles(id) on delete cascade unique not null,
  public_key text not null,
  key_algorithm text default 'RS256',
  created_at timestamptz default now(),
  rotated_at timestamptz
);

alter table public.manufacturer_keys enable row level security;
create policy "Manufacturers view own public key"
  on public.manufacturer_keys for select using (auth.uid() = manufacturer_id);

-- Storage policies for the manufacturer-documents bucket (created via the
-- dashboard as Private). Uploads happen client-side during registration
-- (the user already has an authenticated session by Step 3), scoped to a
-- path prefixed with their own user id so one manufacturer can never read
-- or overwrite another's documents. Admin review reads happen server-side
-- via signed URLs generated with the service role, which bypasses this
-- entirely - no admin-specific storage policy is needed.
--
-- batch-exports gets no client policy at all: per spec, export files are
-- generated server-side and served via a service-role-issued signed URL,
-- so client-side storage RLS is never in that path.
create policy "Manufacturers manage own documents"
  on storage.objects for all
  using (bucket_id = 'manufacturer-documents' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'manufacturer-documents' and (storage.foldername(name))[1] = auth.uid()::text);
