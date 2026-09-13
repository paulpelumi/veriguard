-- Phase 4, Module 1: the admin-facing "a new manufacturer application needs
-- review" notification has no matching type in the existing constraint -
-- verification_approved/rejected are for the manufacturer being notified of
-- an admin decision, not the admin being notified a decision is needed.
alter table public.notifications
  drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'expiry_warning', 'recall_alert', 'verification_complete', 'counterfeit_confirmed',
    'verification_anomaly', 'duplicate_detected', 'batch_scan_milestone',
    'verification_approved', 'verification_rejected', 'subscription_reminder',
    'manufacturer_application'
  ));
