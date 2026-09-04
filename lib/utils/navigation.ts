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

export const navIcons = {
  dashboard: LayoutDashboard,
  inventory: Package,
  verification: ShieldCheck,
  expiry: CalendarClock,
  recalls: AlertTriangle,
  reports: FileBarChart,
  settings: Settings,
  verify: ShieldCheck,
  history: History,
} as const

export type IconName = keyof typeof navIcons

export interface NavItem {
  label: string
  href: string
  icon: IconName
}

export const businessNavItems: NavItem[] = [
  { label: "Dashboard", href: "/business/dashboard", icon: "dashboard" },
  { label: "Inventory", href: "/business/inventory", icon: "inventory" },
  { label: "Verification", href: "/business/verification", icon: "verification" },
  { label: "Expiry Alerts", href: "/business/expiry", icon: "expiry" },
  { label: "Recalls", href: "/business/recalls", icon: "recalls" },
  { label: "Reports", href: "/business/reports", icon: "reports" },
  { label: "Settings", href: "/business/settings", icon: "settings" },
]

export const consumerNavItems: NavItem[] = [
  { label: "Dashboard", href: "/consumer/dashboard", icon: "dashboard" },
  { label: "Verify Product", href: "/consumer/verify", icon: "verify" },
  { label: "History", href: "/consumer/history", icon: "history" },
  { label: "Settings", href: "/consumer/settings", icon: "settings" },
]
