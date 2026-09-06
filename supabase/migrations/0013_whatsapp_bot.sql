-- Phase 3, Module 8: WhatsApp AI Bot.

-- A WhatsApp sender's phone number may not match any registered VeriGuard
-- account - the spec explicitly requires logging those with user_id = null,
-- which this column didn't allow until now.
alter table public.verification_logs alter column user_id drop not null;

-- Per-phone-number rate limiting for the webhook (10 requests/hour, spec).
-- No RLS policies beyond enabling it - this table is only ever touched by
-- the webhook's service-role client (which bypasses RLS entirely), so the
-- correct default for every other role is no access at all, same reasoning
-- as nafdac_cache's write-side.
create table public.whatsapp_rate_limits (
  phone_number text not null,
  request_count integer default 1,
  window_start timestamptz default now(),
  primary key (phone_number)
);

alter table public.whatsapp_rate_limits enable row level security;

-- The webhook itself only ever uses the service role (bypasses RLS), but
-- the admin WhatsApp stats endpoint (app/api/admin/whatsapp/stats) reads
-- this table through the calling admin's own authenticated session, which
-- would otherwise see zero rows no matter how many senders exist.
create policy "Admin can view whatsapp rate limits"
  on public.whatsapp_rate_limits for select using (public.is_admin());

-- Atomically checks and updates a phone number's rate-limit counter in one
-- statement (upsert with a reset-if-expired case), avoiding a racy
-- read-then-write between concurrent webhook deliveries for the same
-- sender. Returns true if this request is within the limit.
create or replace function public.whatsapp_check_rate_limit(
  p_phone_number text,
  p_limit integer default 10,
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
  insert into public.whatsapp_rate_limits (phone_number, request_count, window_start)
  values (p_phone_number, 1, now())
  on conflict (phone_number) do update set
    request_count = case
      when public.whatsapp_rate_limits.window_start <= now() - (p_window_minutes || ' minutes')::interval
        then 1
      else public.whatsapp_rate_limits.request_count + 1
    end,
    window_start = case
      when public.whatsapp_rate_limits.window_start <= now() - (p_window_minutes || ' minutes')::interval
        then now()
      else public.whatsapp_rate_limits.window_start
    end
  returning request_count into v_count;

  return v_count <= p_limit;
end;
$$;

grant execute on function public.whatsapp_check_rate_limit to authenticated, service_role;
