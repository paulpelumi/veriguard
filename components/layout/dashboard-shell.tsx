import { Header } from "@/components/layout/header/header"
import { Sidebar } from "@/components/layout/sidebar/sidebar"
import type { NavItem } from "@/lib/utils/navigation"
import type { UserRole } from "@/types/database"

interface DashboardShellProps {
  navItems: NavItem[]
  homeHref: string
  fullName: string | null
  email: string
  role: UserRole
  children: React.ReactNode
}

export function DashboardShell({
  navItems,
  homeHref,
  fullName,
  email,
  role,
  children,
}: DashboardShellProps) {
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar items={navItems} homeHref={homeHref} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          navItems={navItems}
          homeHref={homeHref}
          fullName={fullName}
          email={email}
          role={role}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
