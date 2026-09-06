-- Global Improvement 1: Profile Completion Flow.
alter table public.profiles
  add column if not exists business_address text,
  add column if not exists profile_completion_skipped_at timestamptz;
