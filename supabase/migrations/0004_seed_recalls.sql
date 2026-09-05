-- Seed data: 3 realistic Nigerian product recalls for testing the
-- Recalls & Alerts module.
insert into public.recall_alerts (product_name, company_name, recall_reason, severity, issued_date, is_active)
values
  ('XYZ Herbal Mixture', 'Unknown Manufacturer', 'Contains undeclared pharmaceutical ingredients not approved by NAFDAC', 'critical', '2025-07-15', true),
  ('Bright Skin Whitening Cream', 'Bright Beauty Ltd', 'Elevated mercury content exceeding permitted limits', 'high', '2025-08-01', true),
  ('Pure Life Table Water (500ml)', 'Generic Distributor', 'Microbial contamination detected in batch CC-2025-08', 'medium', '2025-07-28', true);
