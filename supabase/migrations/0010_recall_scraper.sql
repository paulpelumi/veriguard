-- Phase 3, Module 5: NAFDAC recall scraper support.
alter table public.recall_alerts
  add column if not exists source_url text,
  add column if not exists scraped_at timestamptz,
  add column if not exists raw_content text,
  add column if not exists auto_detected boolean default false;

create index if not exists idx_recall_alerts_source_url on public.recall_alerts(source_url);

-- Belt-and-suspenders beyond the spec's plain index: a partial unique index
-- (NULLs excluded, so manually-added recalls with no source_url are
-- unaffected) lets the scraper use a single atomic
-- `upsert(..., onConflict: "source_url", ignoreDuplicates: true)` instead of
-- a select-then-insert race between overlapping runs, while still matching
-- the spec's own "check by source_url before inserting" dedup rule.
create unique index if not exists idx_recall_alerts_source_url_unique
  on public.recall_alerts(source_url) where source_url is not null;

-- recall_alerts had no write policy at all before this (only the public
-- "Anyone can view active recalls" select policy from 0001_init.sql) - the
-- admin recall-management page (Module 7) and the manual "trigger scrape"
-- action both need an authenticated admin session to insert/update rows,
-- not just the service-role Edge Function.
create policy "Admin can manage recalls"
  on public.recall_alerts for all using (public.is_admin());
