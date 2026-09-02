import type { LucideIcon } from "lucide-react"
import {
  LayoutDashboard,
  Package,
  ShieldCheck,
  CalendarClock,
  AlertTriangle,
  FileBarChart,
  Settings,
  History,
} from "lucide-react"

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
}

export const businessNavItems: NavItem[] = [
  { label: "Dashboard", href: "/business/dashboard", icon: LayoutDashboard },
  { label: "Inventory", href: "/business/inventory", icon: Package },
  { label: "Verification", href: "/business/verification", icon: ShieldCheck },
  { label: "Expiry Alerts", href: "/business/expiry", icon: CalendarClock },
  { label: "Recalls", href: "/business/recalls", icon: AlertTriangle },
  { label: "Reports", href: "/business/reports", icon: FileBarChart },
  { label: "Settings", href: "/business/settings", icon: Settings },
]

export const consumerNavItems: NavItem[] = [
  { label: "Dashboard", href: "/consumer/dashboard", icon: LayoutDashboard },
  { label: "Verify Product", href: "/consumer/verify", icon: ShieldCheck },
  { label: "History", href: "/consumer/history", icon: History },
  { label: "Settings", href: "/consumer/settings", icon: Settings },
]
