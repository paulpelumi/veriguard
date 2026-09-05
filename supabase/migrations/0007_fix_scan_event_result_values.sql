-- Two constraint mismatches found via pg_constraint (information_schema.
-- columns only shows column types, not check constraints, so these
-- weren't visible when record_serial_scan() was first written):
--
-- 1. serial_scan_events.result only allows ('authentic', 'duplicate_warning',
--    'flagged') - the function used made-up values ('first_scan',
--    'duplicate') that violated the real constraint outright.
--
-- 2. product_serials.status allows ('unscanned', 'first_scanned',
--    'rescanned', 'flagged') - a 3-state lifecycle the function didn't
--    know about. It left status stuck at 'first_scanned' forever after
--    the second scan instead of advancing it to 'rescanned'.
--
-- 'flagged' (present on both tables) is left unused here - it reads as a
-- manual/admin moderation action on a specific serial or scan event, not
-- something normal scan-recording should set automatically.
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
    case when v_is_first then 'authentic' else 'duplicate_warning' end
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
    set status = 'rescanned',
        scan_count = v_new_count
    where id = v_serial.id;
    v_first_scanned_at := v_serial.first_scanned_at;
  end if;

  return query select v_serial.id, v_serial.batch_id, v_is_first, v_new_count, v_first_scanned_at;
end;
$$;
