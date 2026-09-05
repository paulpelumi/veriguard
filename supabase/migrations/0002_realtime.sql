-- Enable Supabase Realtime (postgres_changes) on the inventory table.
-- Without this, INSERT/UPDATE/DELETE subscriptions silently receive
-- zero events even with correct RLS policies in place.
alter publication supabase_realtime add table public.inventory;
