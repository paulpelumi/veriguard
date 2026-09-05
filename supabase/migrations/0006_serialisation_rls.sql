-- The serialisation tables (manufacturer_profiles, serialised_products,
-- product_serials, serial_scan_events) were created without RLS enabled -
-- Supabase's own SQL editor flagged this. Fixing it here.

alter table public.manufacturer_profiles enable row level security;
alter table public.serialised_products enable row level security;
alter table public.product_serials enable row level security;
alter table public.serial_scan_events enable row level security;

-- Manufacturer name + verified badge is safe to expose publicly - it's
-- needed to show "Registered to X" on a verification result, same
-- sensitivity level as NAFDAC's own public registry data.
create policy "Anyone can read manufacturer profiles"
  on public.manufacturer_profiles for select using (true);

-- Batch info (product name, NAFDAC number, expiry) is likewise safe to read.
create policy "Anyone can read serialised products"
  on public.serialised_products for select using (true);

-- Reading a serial's status is how verification works, so it must be
-- readable - but NOT directly writable by clients. Without this
-- restriction, any authenticated user could reset a serial's status or
-- scan_count via a raw REST call and erase the anti-counterfeiting signal
-- entirely. Same pattern already used for nafdac_cache: writes only
-- through the security-definer function below.
create policy "Anyone can read product serials"
  on public.product_serials for select using (true);

-- Users can see their own scan history; writes happen only via the function.
create policy "Users can read own scan events"
  on public.serial_scan_events for select
  using (auth.uid() = scanned_by);

-- Atomically records a scan: locks the serial row (preventing a race where
-- two simultaneous scans of the same code both read status='unscanned' and
-- both believe they're the legitimate first scan), logs the event, and
-- updates product_serials accordingly.
create or replace function public.record_serial_scan(
  p_serial_code text,
  p_location_state text default null,
  p_location_lga text default null,
  p_scan_source text default 'web'
)
returns table (
  serial_id uuid,
  batch_id uuid,
  is_first_scan boolean,
  new_scan_count integer,
  first_scanned_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_serial record;
  v_is_first boolean;
  v_new_count integer;
  v_first_scanned_at timestamptz;
begin
  select * into v_serial from public.product_serials where serial_code = p_serial_code for update;

  if not found then
    return;
  end if;

  v_is_first := v_serial.status = 'unscanned';
  v_new_count := coalesce(v_serial.scan_count, 0) + 1;

  insert into public.serial_scan_events (serial_id, scanned_by, location_state, location_lga, scan_source, result)
  values (
    v_serial.id,
    auth.uid(),
    p_location_state,
    p_location_lga,
    p_scan_source,
    case when v_is_first then 'first_scan' else 'duplicate' end
  );

  if v_is_first then
    update public.product_serials
    set status = 'first_scanned',
        first_scanned_at = now(),
        first_scanned_by = auth.uid(),
        first_scanned_location = p_location_state,
        scan_count = v_new_count
    where id = v_serial.id;
    v_first_scanned_at := now();
  else
    update public.product_serials
    set scan_count = v_new_count
    where id = v_serial.id;
    v_first_scanned_at := v_serial.first_scanned_at;
  end if;

  return query select v_serial.id, v_serial.batch_id, v_is_first, v_new_count, v_first_scanned_at;
end;
$$;

grant execute on function public.record_serial_scan to authenticated;
