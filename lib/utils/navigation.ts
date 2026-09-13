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
  report: Flag,
  users: Users,
  anomalies: Activity,
  gs1: Barcode,
  intelligence: Map,
  manufacturers: Factory,
  batches: Layers,
  generate: QrCode,
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
  { label: "Report a Product", href: "/consumer/report", icon: "report" },
  { label: "Settings", href: "/consumer/settings", icon: "settings" },
]

export const adminNavItems: NavItem[] = [
  { label: "Overview", href: "/admin", icon: "dashboard" },
  { label: "Users", href: "/admin/users", icon: "users" },
  { label: "Manufacturers", href: "/admin/manufacturers", icon: "manufacturers" },
  { label: "Counterfeit Reports", href: "/admin/reports", icon: "reports" },
  { label: "Recall Management", href: "/admin/recalls", icon: "recalls" },
  { label: "Anomalies", href: "/admin/anomalies", icon: "anomalies" },
  { label: "GS1 Database", href: "/admin/gs1", icon: "gs1" },
  { label: "Geographic Intelligence", href: "/admin/intelligence", icon: "intelligence" },
  { label: "Platform Settings", href: "/admin/settings", icon: "settings" },
]

// Grows one item per module as each actually ships (Module 4 added
// Products & Batches and Generate Codes; Scan Analytics and Duplicate
// Alerts follow with Modules 5-6) - never a nav link pointing at a page
// that doesn't exist yet.
export const manufacturerNavItems: NavItem[] = [
  { label: "Dashboard", href: "/manufacturer/dashboard", icon: "dashboard" },
  { label: "My Machines", href: "/manufacturer/machines", icon: "manufacturers" },
  { label: "Products & Batches", href: "/manufacturer/batches", icon: "batches" },
  { label: "Generate Codes", href: "/manufacturer/generate", icon: "generate" },
  { label: "Settings", href: "/manufacturer/settings", icon: "settings" },
]
