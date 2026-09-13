import {
  LayoutDashboard,
  Package,
  ShieldCheck,
  CalendarClock,
  AlertTriangle,
  FileBarChart,
  Settings,
  History,
  Flag,
  Users,
  Activity,
  Barcode,
  Map,
  Factory,
  Layers,
  QrCode,
  CreditCard,
  KeyRound,
} from "lucide-react"
import type { UserRole } from "@/types/database"

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
  report: Flag,
  users: Users,
  anomalies: Activity,
  gs1: Barcode,
  intelligence: Map,
  manufacturers: Factory,
  batches: Layers,
  generate: QrCode,
  alerts: AlertTriangle,
  analytics: Activity,
  serialCodes: QrCode,
  billing: CreditCard,
  apiKeys: KeyRound,
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
  { label: "API Keys", href: "/business/api-keys", icon: "apiKeys" },
  { label: "Billing", href: "/billing", icon: "billing" },
  { label: "Settings", href: "/business/settings", icon: "settings" },
]

export const consumerNavItems: NavItem[] = [
  { label: "Dashboard", href: "/consumer/dashboard", icon: "dashboard" },
  { label: "Verify Product", href: "/consumer/verify", icon: "verify" },
  { label: "History", href: "/consumer/history", icon: "history" },
  { label: "Report a Product", href: "/consumer/report", icon: "report" },
  { label: "Billing", href: "/billing", icon: "billing" },
  { label: "Settings", href: "/consumer/settings", icon: "settings" },
]

export const adminNavItems: NavItem[] = [
  { label: "Overview", href: "/admin", icon: "dashboard" },
  { label: "Users", href: "/admin/users", icon: "users" },
  { label: "Manufacturers", href: "/admin/manufacturers", icon: "manufacturers" },
  { label: "Serial Codes", href: "/admin/serial-codes", icon: "serialCodes" },
  { label: "Duplicate Alerts", href: "/admin/duplicates", icon: "alerts" },
  { label: "Counterfeit Reports", href: "/admin/reports", icon: "reports" },
  { label: "Recall Management", href: "/admin/recalls", icon: "recalls" },
  { label: "Anomalies", href: "/admin/anomalies", icon: "anomalies" },
  { label: "GS1 Database", href: "/admin/gs1", icon: "gs1" },
  { label: "Geographic Intelligence", href: "/admin/intelligence", icon: "intelligence" },
  { label: "Platform Settings", href: "/admin/settings", icon: "settings" },
]

// Every Phase 4 manufacturer module now shipped (0-6) - this list is
// complete for the phase.
export const manufacturerNavItems: NavItem[] = [
  { label: "Dashboard", href: "/manufacturer/dashboard", icon: "dashboard" },
  { label: "My Machines", href: "/manufacturer/machines", icon: "manufacturers" },
  { label: "Products & Batches", href: "/manufacturer/batches", icon: "batches" },
  { label: "Generate Codes", href: "/manufacturer/generate", icon: "generate" },
  { label: "Scan Analytics", href: "/manufacturer/analytics", icon: "analytics" },
  { label: "Duplicate Alerts", href: "/manufacturer/alerts", icon: "alerts" },
  { label: "Billing", href: "/billing", icon: "billing" },
  { label: "Settings", href: "/manufacturer/settings", icon: "settings" },
]

// Phase 5 Module 1 - /billing is a single shared route (not nested under
// any one role's area), so its layout needs each role's own nav array to
// render the correct sidebar rather than a fourth hardcoded copy of it.
// Admin is deliberately absent - platform staff have no subscription of
// their own to manage.
export function navItemsForRole(role: UserRole): NavItem[] {
  switch (role) {
    case "business":
      return businessNavItems
    case "manufacturer":
      return manufacturerNavItems
    default:
      return consumerNavItems
  }
}
