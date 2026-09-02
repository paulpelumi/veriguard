"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Logo } from "@/components/shared/logo"
import { SidebarNav } from "@/components/layout/sidebar/sidebar-nav"
import type { NavItem } from "@/lib/utils/navigation"

interface MobileNavProps {
  items: NavItem[]
  homeHref: string
}

export function MobileNav({ items, homeHref }: MobileNavProps) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon" className="md:hidden" />}
      >
        <Menu className="size-5" />
        <span className="sr-only">Open menu</span>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-64 bg-sidebar p-0 text-sidebar-foreground"
      >
        <SheetHeader className="h-16 justify-center border-b border-sidebar-border px-5">
          <SheetTitle
            render={<Link href={homeHref} onClick={() => setOpen(false)} />}
          >
            <Logo />
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto py-4">
          <SidebarNav items={items} onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
