import type { createClient } from "@/lib/supabase/server"
import { startOfTodayIso } from "@/lib/utils/date"

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export interface AdminOverviewStats {
  totalUsers: number
  totalVerifications: number
  verificationsToday: number
  totalReports: number
  pendingReports: number
  totalInventoryItems: number
  activeRecalls: number
  activeAnomalies: number
}

export type ActivityEventType = "user_registered" | "report_submitted" | "recall_added" | "anomaly_detected"

export interface ActivityEvent {
  type: ActivityEventType
  timestamp: string
  label: string
  sublabel?: string
  href: string
}

const ACTIVITY_FEED_LIMIT = 20
// Pulled per source before merging - generous enough that 20 real events
// rarely come from a single source, without pulling the whole table.
const PER_SOURCE_LIMIT = 20

async function countRows(
  supabase: SupabaseServerClient,
  table: "profiles" | "verification_logs" | "counterfeit_reports" | "inventory"
) {
  const { count } = await supabase.from(table).select("id", { count: "exact", head: true })
  return count ?? 0
}

export async function getAdminOverviewStats(supabase: SupabaseServerClient): Promise<AdminOverviewStats> {
  const [
    totalUsers,
    totalVerifications,
    verificationsToday,
    totalReports,
    pendingReports,
    totalInventoryItems,
    activeRecalls,
    activeAnomalies,
  ] = await Promise.all([
    countRows(supabase, "profiles"),
    countRows(supabase, "verification_logs"),
    supabase
      .from("verification_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfTodayIso())
      .then((r) => r.count ?? 0),
    countRows(supabase, "counterfeit_reports"),
    supabase
      .from("counterfeit_reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .then((r) => r.count ?? 0),
    countRows(supabase, "inventory"),
    supabase
      .from("recall_alerts")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .then((r) => r.count ?? 0),
    supabase
      .from("verification_anomalies")
      .select("id", { count: "exact", head: true })
      .eq("is_resolved", false)
      .then((r) => r.count ?? 0),
  ])

  return {
    totalUsers,
    totalVerifications,
    verificationsToday,
    totalReports,
    pendingReports,
    totalInventoryItems,
    activeRecalls,
    activeAnomalies,
  }
}

// Raw per-verification events are deliberately excluded here - at any real
// volume they'd be the overwhelming majority of "last 20 events" and drown
// out everything else the admin actually wants to notice. This feed is
// scoped to genuinely notable platform activity instead: new signups,
// reports, recalls, and anomalies.
export async function getRecentActivity(supabase: SupabaseServerClient): Promise<ActivityEvent[]> {
  const [{ data: users }, { data: reports }, { data: recalls }, { data: anomalies }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role, created_at")
      .order("created_at", { ascending: false })
      .limit(PER_SOURCE_LIMIT),
    supabase
      .from("counterfeit_reports")
      .select("id, product_name, created_at")
      .order("created_at", { ascending: false })
      .limit(PER_SOURCE_LIMIT),
    supabase
      .from("recall_alerts")
      .select("id, product_name, auto_detected, created_at")
      .order("created_at", { ascending: false })
      .limit(PER_SOURCE_LIMIT),
    supabase
      .from("verification_anomalies")
      .select("id, nafdac_number, severity, created_at")
      .order("created_at", { ascending: false })
      .limit(PER_SOURCE_LIMIT),
  ])

  const events: ActivityEvent[] = [
    ...(users ?? []).map((u) => ({
      type: "user_registered" as const,
      timestamp: u.created_at,
      label: u.full_name ?? u.email,
      sublabel: `New ${u.role} account`,
      href: `/admin/users`,
    })),
    ...(reports ?? []).map((r) => ({
      type: "report_submitted" as const,
      timestamp: r.created_at,
      label: `Report: ${r.product_name}`,
      sublabel: "Counterfeit report submitted",
      href: `/admin/reports`,
    })),
    ...(recalls ?? []).map((r) => ({
      type: "recall_added" as const,
      timestamp: r.created_at,
      label: `Recall: ${r.product_name}`,
      sublabel: r.auto_detected ? "Auto-detected recall" : "Manually added recall",
      href: `/admin/recalls`,
    })),
    ...(anomalies ?? []).map((a) => ({
      type: "anomaly_detected" as const,
      timestamp: a.created_at,
      label: `Anomaly: ${a.nafdac_number}`,
      sublabel: `${a.severity} severity`,
      href: `/admin/anomalies`,
    })),
  ]

  return events
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, ACTIVITY_FEED_LIMIT)
}
