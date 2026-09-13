-- Phase 5 Module 4: WhatsApp AI bot Phase 2 - NLP fallback, 5-language
-- support (whatsapp_sessions.language already existed from migration 0021
-- but nothing read/wrote it until this module), vision-based image
-- fallback, and proactive recall alerts.

-- verification_logs has no phone number anywhere on it - only user_id,
-- which is null for any WhatsApp sender whose number doesn't match a
-- registered profile.phone (see message-router.ts's resolveSender). That
-- makes a huge share of real WhatsApp verifiers permanently unreachable
-- for a proactive "this product you checked just got recalled" alert,
-- since there's no way to look up their number later. Populated only for
-- source='whatsapp' rows going forward - existing rows stay null, so
-- historical WhatsApp verifications before this ships aren't recoverable.
alter table public.verification_logs
  add column if not exists phone_number text;

-- Partial index matching exactly the recall-notifier's query shape
-- (lib/whatsapp/recall-notifier.ts): find every distinct WhatsApp number
-- that verified a given NAFDAC number recently. Indexing only the rows
-- that could ever match keeps this small regardless of overall
-- verification_logs volume.
create index if not exists idx_verification_logs_whatsapp_recall_lookup
  on public.verification_logs(nafdac_number)
  where source = 'whatsapp' and phone_number is not null;

-- Idempotency guard for the recall notifier - a recall can be viewed/edited
-- multiple times after creation (app/api/admin/recalls PATCH), and the
-- same phone number could otherwise be re-sent the same template message
-- if the notifier were ever re-triggered for the same recall.
create table if not exists public.whatsapp_recall_notifications (
  recall_id uuid references public.recall_alerts(id) on delete cascade not null,
  phone_number text not null,
  sent_at timestamptz default now(),
  primary key (recall_id, phone_number)
);

-- Service-role only (the notifier always runs from the admin recall-creation
-- route using the service-role client) - same pattern as
-- whatsapp_rate_limits and whatsapp_sessions: RLS enabled, no policies.
alter table public.whatsapp_recall_notifications enable row level security;
