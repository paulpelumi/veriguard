-- Phase 4 Module 5: extends record_serial_scan() (0007) with the
-- duplicate-tracking columns that already existed on both tables since
-- 0015 but nothing wrote to (is_duplicate, duplicate_scan_count,
-- is_flagged) - plus auto-creating a counterfeit report and notifying
-- the manufacturer the FIRST time a given serial is caught as a
-- duplicate, not on every repeat scan of an already-known-bad code
-- (which would spam both queues with reports of the same physical item).
--
-- 0007's own comment called auto-setting 'flagged' out of scope ("reads
-- as a manual/admin moderation action... not something normal
-- scan-recording should set automatically") - that was true for Phase
-- 3's narrower scope. The spec for this module explicitly asks for
-- automatic flagging past a duplicate-count threshold, so that stance
-- changes here.

-- 0015's only manufacturer_keys policy scoped reads to auth.uid() =
-- manufacturer_id - fine for a manufacturer checking their own key, but
-- it silently blocked every consumer verification from ever reading ANY
-- manufacturer's public key (a consumer scanning a product is never that
-- manufacturer), which would have made signature verification below a
-- no-op for the entire public-facing scan flow. A public key is public
-- by definition - nothing here exposes VERIGUARD_PILOT_PRIVATE_KEY,
-- which never touches the database at all.
create policy "Public keys are publicly readable"
  on public.manufacturer_keys for select using (true);

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
  first_scanned_at timestamptz,
  first_scanned_location text,
  is_duplicate boolean,
  duplicate_scan_count integer,
  is_flagged boolean,
  qr_payload text,
  signature text,
  report_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_serial record;
  v_is_first boolean;
  v_new_count integer;
  v_new_duplicate_count integer;
  v_now_flagged boolean;
  v_batch record;
  v_report_id uuid;
begin
  select * into v_serial from public.product_serials where serial_code = p_serial_code for update;

  if not found then
    return;
  end if;

  v_is_first := v_serial.status = 'unscanned';
  v_new_count := coalesce(v_serial.scan_count, 0) + 1;
  v_new_duplicate_count := coalesce(v_serial.duplicate_scan_count, 0) + (case when v_is_first then 0 else 1 end);
  v_now_flagged := v_serial.is_flagged or v_new_duplicate_count >= 3;

  insert into public.serial_scan_events (serial_id, scanned_by, location_state, location_lga, scan_source, result, is_duplicate)
  values (
    v_serial.id,
    auth.uid(),
    p_location_state,
    p_location_lga,
    p_scan_source,
    case when v_is_first then 'authentic' when v_now_flagged then 'flagged' else 'duplicate_warning' end,
    not v_is_first
  );

  if v_is_first then
    update public.product_serials
    set status = 'first_scanned',
        first_scanned_at = now(),
        first_scanned_by = auth.uid(),
        first_scanned_location = p_location_state,
        scan_count = v_new_count
    where id = v_serial.id;
  else
    update public.product_serials
    set status = case when v_now_flagged then 'flagged' else 'rescanned' end,
        scan_count = v_new_count,
        duplicate_scan_count = v_new_duplicate_count,
        is_flagged = v_now_flagged,
        flag_reason = case
          when v_now_flagged and not v_serial.is_flagged
            then 'Scanned ' || v_new_duplicate_count || ' times after the first scan - likely counterfeit'
          else v_serial.flag_reason
        end
    where id = v_serial.id;

    if v_new_duplicate_count = 1 then
      select sp.manufacturer_id, sp.product_name, sp.nafdac_number
        into v_batch
        from public.serialised_products sp
        where sp.id = v_serial.batch_id;

      if v_batch.manufacturer_id is not null then
        insert into public.notifications (user_id, type, title, message, link, metadata)
        values (
          v_batch.manufacturer_id,
          'duplicate_detected',
          'Duplicate scan detected - ' || v_batch.product_name,
          'Serial ' || p_serial_code || ' was scanned again after its first scan in ' ||
            coalesce(v_serial.first_scanned_location, 'an unknown location') || '. This may indicate counterfeiting.',
          '/manufacturer/alerts',
          jsonb_build_object(
            'serial_code', p_serial_code,
            'batch_id', v_serial.batch_id,
            'first_scanned_location', v_serial.first_scanned_location,
            'current_scan_location', p_location_state
          )
        );

        insert into public.counterfeit_reports (reporter_id, nafdac_number, product_name, suspicion_reason, description, status)
        values (
          auth.uid(),
          v_batch.nafdac_number,
          v_batch.product_name,
          'Duplicate VeriGuard serial code',
          'Serial ' || p_serial_code || ' was flagged automatically: the same VeriGuard code was scanned more than once, which should never happen for a genuine unit.',
          'pending'
        )
        returning id into v_report_id;
      end if;
    end if;
  end if;

  return query select
    v_serial.id,
    v_serial.batch_id,
    v_is_first,
    v_new_count,
    case when v_is_first then now() else v_serial.first_scanned_at end,
    v_serial.first_scanned_location,
    not v_is_first,
    v_new_duplicate_count,
    v_now_flagged,
    v_serial.qr_payload,
    v_serial.signature,
    v_report_id;
end;
$$;
