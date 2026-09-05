-- Phase 3, Module 7: Admin Dashboard.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('consumer', 'business', 'manufacturer', 'admin'));

alter table public.profiles add column if not exists is_suspended boolean default false;

-- profiles previously only let a user see/edit their own row. The user
-- management page (list everyone, suspend, change role) needs both.
create policy "Admin can view all profiles"
  on public.profiles for select using (public.is_admin());
create policy "Admin can update all profiles"
  on public.profiles for update using (public.is_admin());

-- "Total inventory items across all businesses" (admin overview stat) needs
-- cross-business read; inventory was business-owner-only before this.
create policy "Admin can view all inventory"
  on public.inventory for select using (public.is_admin());

-- The report-management page needs to change report status (Mark Reviewed /
-- Confirm / Dismiss), which counterfeit_reports had no update policy for at
-- all (only insert, and select-your-own).
create policy "Admin can update all counterfeit reports"
  on public.counterfeit_reports for update using (public.is_admin());

-- Confirmed-counterfeit flag, kept separate from nafdac_cache's existing
-- registration_status column - that field reflects what NAFDAC itself
-- reports, not our own investigation outcome, and conflating the two would
-- make it ambiguous which system asserted what.
alter table public.nafdac_cache add column if not exists confirmed_counterfeit boolean default false;
alter table public.nafdac_cache add column if not exists flagged_at timestamptz;

-- Confirming a report as counterfeit is a significant, platform-wide write
-- (it changes what every future user sees when verifying this number), so
-- it goes through a narrow security-definer function - consistent with how
-- every other cross-user write in this project works (upsert_nafdac_cache,
-- record_serial_scan) - rather than a general admin write policy on
-- nafdac_cache, which currently has none at all.
create or replace function public.admin_confirm_counterfeit(p_nafdac_number text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  update public.nafdac_cache
  set confirmed_counterfeit = true, flagged_at = now()
  where nafdac_number = p_nafdac_number;
end;
$$;

grant execute on function public.admin_confirm_counterfeit to authenticated;

-- Per-anomaly detail for the admin anomalies page ("list of states where
-- verifications occurred") - distinct from Module 6's active_anomaly_states
-- (which answers "which states have ANY active anomaly"), this answers
-- "which states touched THIS SPECIFIC anomaly's NAFDAC number".
create or replace function public.anomaly_states_touched(p_nafdac_number text, p_since timestamptz)
returns text[]
language sql stable
as $$
  select coalesce(array_agg(distinct coalesce(v.user_state, p.state)), array[]::text[])
  from public.verification_logs v
  join public.profiles p on p.id = v.user_id
  where v.nafdac_number = p_nafdac_number
    and v.created_at >= p_since
    and coalesce(v.user_state, p.state) is not null;
$$;
