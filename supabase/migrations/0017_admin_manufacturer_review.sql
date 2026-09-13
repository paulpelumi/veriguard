-- Phase 4, Module 1.4: 0015 only gave manufacturers permission to manage
-- their OWN manufacturer_profiles row - the admin review flow (approve/
-- reject someone else's application) needs its own policy, same pattern as
-- "Admin can update all profiles" from Phase 3 Module 7.
create policy "Admin can manage all manufacturer profiles"
  on public.manufacturer_profiles for all using (public.is_admin());
