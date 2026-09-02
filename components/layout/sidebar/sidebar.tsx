import Link from "next/link"

import { Logo } from "@/components/shared/logo"
import { SidebarNav } from "@/components/layout/sidebar/sidebar-nav"
import type { NavItem } from "@/lib/utils/navigation"

interface SidebarProps {
  items: NavItem[]
  homeHref: string
}

export function Sidebar({ items, homeHref }: SidebarProps) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex h-16 items-center border-b border-sidebar-border px-5">
        <Link href={homeHref}>
          <Logo />
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <SidebarNav items={items} />
      </div>
    </aside>
  )
}
