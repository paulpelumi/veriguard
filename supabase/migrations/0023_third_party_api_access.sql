-- Phase 5 Module 3: third-party API access.

-- api_keys itself already exists (migration 0021) with rate_limit_per_hour
-- as a per-key column, but nothing enforces it yet. Mirrors
-- whatsapp_rate_limits/whatsapp_check_rate_limit (0013_whatsapp_bot.sql)
-- exactly - same atomic upsert-with-reset-if-expired shape, just keyed by
-- api key id instead of phone number, so a burst of concurrent requests
-- against one key can't race past the limit the way a plain
-- read-then-write would allow.
create table if not exists public.api_key_rate_limits (
  key_id uuid references public.api_keys(id) on delete cascade primary key,
  request_count integer default 1,
  window_start timestamptz default now()
);

alter table public.api_key_rate_limits enable row level security;

create or replace function public.api_key_check_rate_limit(
  p_key_id uuid,
  p_limit integer default 100,
  p_window_minutes integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.api_key_rate_limits (key_id, request_count, window_start)
  values (p_key_id, 1, now())
  on conflict (key_id) do update set
    request_count = case
      when public.api_key_rate_limits.window_start <= now() - (p_window_minutes || ' minutes')::interval
        then 1
      else public.api_key_rate_limits.request_count + 1
    end,
    window_start = case
      when public.api_key_rate_limits.window_start <= now() - (p_window_minutes || ' minutes')::interval
        then now()
      else public.api_key_rate_limits.window_start
    end
  returning request_count into v_count;

  return v_count <= p_limit;
end;
$$;

grant execute on function public.api_key_check_rate_limit(uuid, integer, integer) to service_role;

-- api_access is a feature flag only Business Professional/Enterprise carry
-- (subscription_plans.features), but neither plan had a numeric ceiling on
-- how many calls that access is actually good for - unlike every other
-- gated action in this schema (monthly_verifications, monthly_codes,
-- inventory_items). Professional gets a real monthly cap; Enterprise stays
-- unlimited, consistent with how it's already unlimited on every other
-- metric.
update public.subscription_plans
  set limits = limits || '{"api_calls": 10000}'::jsonb
  where name = 'Business Professional';

update public.subscription_plans
  set limits = limits || '{"api_calls": -1}'::jsonb
  where name = 'Business Enterprise';
