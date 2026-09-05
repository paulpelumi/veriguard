import { HeaderSearch } from "@/components/layout/header/header-search"
import { UserMenu } from "@/components/layout/header/user-menu"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { MobileNav } from "@/components/layout/mobile-nav/mobile-nav"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import type { NavItem } from "@/lib/utils/navigation"
import type { UserRole } from "@/types/database"

interface HeaderProps {
  navItems: NavItem[]
  homeHref: string
  fullName: string | null
  email: string
  role: UserRole
}

export function Header({ navItems, homeHref, fullName, email, role }: HeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background px-4 sm:px-6">
      <MobileNav items={navItems} homeHref={homeHref} />
      <HeaderSearch role={role} />
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <NotificationBell />
        <UserMenu fullName={fullName} email={email} role={role} />
      </div>
    </header>
  )
}
