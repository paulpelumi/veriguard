"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { navIcons, type NavItem } from "@/lib/utils/navigation"

interface SidebarNavProps {
  items: NavItem[]
  onNavigate?: () => void
}

export function SidebarNav({ items, onNavigate }: SidebarNavProps) {
  const pathname = usePathname()

  // A plain per-item startsWith check marks every nav item active at once
  // whenever one item's href is a prefix of another's (e.g. "Overview" at
  // /admin prefix-matches every other /admin/* item, since they're all
  // nested under it in the URL even though they're siblings, not
  // children, in the actual nav). Picking only the longest matching href
  // makes exactly one item active regardless of how much overlap exists.
  const activeHref = items
    .map((item) => item.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0]

  return (
    <nav className="flex flex-col gap-1 px-3">
      {items.map((item) => {
        const isActive = item.href === activeHref
        const Icon = navIcons[item.icon]

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
