-- Phase 5 Module 2: usage tracking, limit enforcement, and upgrade prompts.

-- Business had no $0 tier at all (every business plan is paid), unlike
-- Consumer Free and Manufacturer Pilot - Module 1's CurrentPlanCard had to
-- special-case that as a "not subscribed" state. Adding a real Business
-- Free tier here closes that gap properly: every role now has an implicit
-- plan from signup, and Module 2's limit checks (below) have something to
-- enforce for a business that hasn't paid yet, exactly like the other two
-- roles already do.
insert into public.subscription_plans
  (name, role, tier, price_monthly_kobo, price_yearly_kobo, features, limits)
values
('Business Free', 'business', 'free', 0, 0,
  '{"inventory": true, "validator": true, "expiry_alerts": true,
    "recall_alerts": true, "reports": true, "analytics": false,
    "api_access": false, "multi_branch": false}',
  '{"inventory_items": 50, "users": 1, "monthly_verifications": -1}')
on conflict (name) do nothing;

-- Atomic increment for usage_records - a plain select-then-upsert from
-- application code could under-count under concurrent requests (two
-- verifications landing in the same millisecond could both read count=5
-- and both write count=6, losing one), the same class of race every other
-- counter in this schema already avoids via a security-definer RPC (see
-- record_serial_scan, increment_nafdac_cache_hit).
create or replace function public.record_usage(
  p_user_id uuid,
  p_metric text,
  p_count integer default 1
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usage_records (user_id, metric, count, period_month, period_year)
  values (
    p_user_id,
    p_metric,
    p_count,
    extract(month from now())::integer,
    extract(year from now())::integer
  )
  on conflict (user_id, metric, period_month, period_year)
  do update set count = usage_records.count + excluded.count;
end;
$$;

grant execute on function public.record_usage(uuid, text, integer) to authenticated, service_role;

-- Inventory's insert is a direct client-side Supabase call guarded only by
-- RLS ("Business can manage own inventory" - auth.uid() = business_id),
-- not a server route (see hooks/use-inventory.ts) - a client-side-only
-- limit check would be trivially bypassable by anyone calling the same
-- insert with valid credentials. A BEFORE INSERT trigger enforces the
-- plan's inventory_items limit at the database level instead, so it holds
-- regardless of which code path performs the insert.
create or replace function public.enforce_inventory_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
begin
  select coalesce((sp.limits->>'inventory_items')::integer, -1)
  into v_limit
  from public.user_subscriptions us
  join public.subscription_plans sp on sp.id = us.plan_id
  where us.user_id = new.business_id
    and us.status in ('active', 'trial')
  order by us.created_at desc
  limit 1;

  -- No active paid subscription - fall back to the implicit Business Free
  -- tier's limit, mirroring getEffectivePlan()'s own fallback in
  -- lib/payments/subscription-manager.ts.
  if v_limit is null then
    select coalesce((sp.limits->>'inventory_items')::integer, -1)
    into v_limit
    from public.subscription_plans sp
    where sp.role = 'business' and sp.tier = 'free'
    limit 1;
  end if;

  if v_limit is not null and v_limit >= 0 then
    if (select count(*) from public.inventory where business_id = new.business_id) >= v_limit then
      raise exception 'Inventory limit reached for your plan. Upgrade to add more products.'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_inventory_limit on public.inventory;
create trigger trg_enforce_inventory_limit
  before insert on public.inventory
  for each row execute function public.enforce_inventory_limit();

-- Separate, pre-existing bug found while building this module:
-- manufacturer_profiles.units_generated_this_month (Phase 4) and
-- whatsapp_sessions.monthly_count (Phase 5 schema) both accumulate with no
-- reset logic anywhere in the codebase - confirmed by grepping every
-- migration and every app/api route. Once a manufacturer crosses their
-- monthly_unit_limit they'd stay blocked forever, not just for the rest of
-- that month. This function is called monthly by a Vercel Cron hitting
-- app/api/cron/reset-usage (protected by CRON_SECRET) - usage_records
-- itself needs no equivalent reset since it's already keyed by
-- period_month/period_year and a new period just starts a new row.
create or replace function public.reset_monthly_usage_counters()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.manufacturer_profiles set units_generated_this_month = 0;
  update public.whatsapp_sessions set monthly_count = 0, monthly_reset_at = now();
end;
$$;

grant execute on function public.reset_monthly_usage_counters() to service_role;
