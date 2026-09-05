"use client"

import { useState } from "react"
import Link from "next/link"
import { LogOut, Settings } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/client"
import type { UserRole } from "@/types/database"

interface UserMenuProps {
  fullName: string | null
  email: string
  role: UserRole
}

function getInitials(fullName: string | null, email: string) {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/)
    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("")
  }
  return email[0]?.toUpperCase() ?? "?"
}

export function UserMenu({ fullName, email, role }: UserMenuProps) {
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function handleSignOut() {
    setIsSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    // Hard navigation clears all client-side state/cache and guarantees
    // the proxy re-evaluates the (now signed-out) session from scratch.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/"
  }

  const settingsHref =
    role === "business" ? "/business/settings" : role === "admin" ? "/admin/settings" : "/consumer/settings"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="rounded-full" />}
      >
        <Avatar>
          <AvatarFallback>{getInitials(fullName, email)}</AvatarFallback>
        </Avatar>
        <span className="sr-only">Open user menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{fullName ?? "Account"}</span>
            <span className="text-xs font-normal text-muted-foreground">{email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href={settingsHref} />}>
          <Settings className="size-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={isSigningOut}
          onClick={handleSignOut}
        >
          <LogOut className="size-4" />
          {isSigningOut ? "Signing out..." : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
