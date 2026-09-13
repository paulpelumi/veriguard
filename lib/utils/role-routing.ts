import type { UserRole } from "@/types/database"

// Single source of truth for "which role owns which area" - both the
// middleware and every dashboard layout key off this instead of each
// hand-rolling its own pairwise redirect rules. That pairwise approach is
// exactly how Phase 3 shipped an infinite redirect loop: business/layout.tsx
// and consumer/layout.tsx each only knew about two roles, so an admin
// visiting either bounced forever between them until a third case was
// patched in by hand. Adding manufacturer as a fourth role here instead of
// patching every existing layout again the same way it was fixed last time.
export const ROLE_HOME: Record<UserRole, string> = {
  admin: "/admin",
  business: "/business/dashboard",
  manufacturer: "/manufacturer/dashboard",
  consumer: "/consumer/dashboard",
}

const ROLE_AREA_PREFIX: Record<UserRole, string> = {
  admin: "/admin",
  business: "/business",
  manufacturer: "/manufacturer",
  consumer: "/consumer",
}

export function homeForRole(role: string | null | undefined): string {
  return ROLE_HOME[role as UserRole] ?? ROLE_HOME.consumer
}

// Which role's area a pathname belongs to, if any (e.g. "/business/inventory"
// -> "business"). Used to redirect anyone in the wrong area to their own
// home in one generic check, rather than one bespoke check per role.
export function roleAreaForPath(pathname: string): UserRole | null {
  const entry = (Object.entries(ROLE_AREA_PREFIX) as [UserRole, string][]).find(([, prefix]) =>
    pathname.startsWith(prefix)
  )
  return entry ? entry[0] : null
}
