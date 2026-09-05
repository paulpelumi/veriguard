-- Alert settings (one row per business)
create table public.alert_settings (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references public.profiles(id) on delete cascade unique not null,
  expiry_alerts_enabled boolean default true,
  alert_90_days boolean default true,
  alert_60_days boolean default true,
  alert_30_days boolean default true,
  alert_expired boolean default true,
  email_alerts boolean default false,
  per_category_thresholds boolean default false,
  drug_alert_days integer default 90,
  food_alert_days integer default 30,
  cosmetic_alert_days integer default 60,
  drink_alert_days integer default 30,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.alert_settings enable row level security;
create policy "Business can manage own alert settings"
  on public.alert_settings for all using (auth.uid() = business_id);

-- In-app notifications
create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('expiry_warning', 'recall_alert', 'verification_complete', 'counterfeit_confirmed')),
  title text not null,
  message text not null,
  link text,
  is_read boolean default false,
  metadata jsonb,
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;
create policy "Users can manage own notifications"
  on public.notifications for all using (auth.uid() = user_id);

-- Enable realtime so the notification bell updates live, same as inventory.
alter publication supabase_realtime add table public.notifications;

-- Global improvement #5: remaining indexes not already created in 0001.
create index if not exists idx_verification_logs_created_at on public.verification_logs(created_at desc);
create index if not exists idx_notifications_user_id on public.notifications(user_id, is_read, created_at desc);
create index if not exists idx_counterfeit_reports_status on public.counterfeit_reports(status);
