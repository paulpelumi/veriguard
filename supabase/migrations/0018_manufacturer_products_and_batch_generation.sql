-- Phase 4 Module 4: a proper product registry, so a manufacturer
-- registers a product once (name, NAFDAC number, category, image,
-- storage conditions) and re-uses it across many batches, instead of
-- retyping product details into every serialised_products row.
-- serialised_products itself keeps functioning exactly as it already
-- does (it IS the batches table - see the comment above its own alter
-- table in 0015_manufacturer_portal_schema.sql); this just gives each
-- batch something to point back at.
create table public.manufacturer_products (
  id uuid default gen_random_uuid() primary key,
  manufacturer_id uuid references public.manufacturer_profiles(id) on delete cascade not null,
  product_name text not null,
  nafdac_number text not null,
  product_category text,
  description text,
  standard_batch_size integer,
  product_image_url text,
  storage_conditions text,
  created_at timestamptz default now()
);

create index on public.manufacturer_products(manufacturer_id);

alter table public.manufacturer_products enable row level security;
create policy "Manufacturers manage own products"
  on public.manufacturer_products for all using (auth.uid() = manufacturer_id);

alter table public.serialised_products
  add column if not exists product_id uuid references public.manufacturer_products(id);

-- product_serials.serial_code already has a plain (non-unique) index from
-- 0015. Code generation (this module) relies on serial codes actually
-- being unique platform-wide - a manufacturer's own sequence is
-- monotonic per manufacturer_code, so a collision would only ever come
-- from two manufacturers landing on the same derived 2-letter code in
-- the same year, which is a real but rare pilot-scale risk. Enforcing it
-- at the DB level turns that into a clean insert failure instead of
-- silently accepting a duplicate serial.
create unique index if not exists idx_product_serials_serial_code_unique
  on public.product_serials(serial_code);
