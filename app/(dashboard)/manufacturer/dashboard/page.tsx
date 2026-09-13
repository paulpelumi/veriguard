import { AlertTriangle, CheckCircle2, Clock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"

// Module 1's scope is registration + verification, not the full dashboard
// (stats cards, usage bar, scan charts, geo map) - that's Module 2. This
// page exists only so registration has somewhere real to land, with the
// three states a freshly-registered manufacturer can actually be in.
export default async function ManufacturerDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: manufacturer } = await supabase
    .from("manufacturer_profiles")
    .select("company_name, verification_status, rejection_reason, auto_check_result")
    .eq("id", user!.id)
    .maybeSingle()

  const status = manufacturer?.verification_status ?? "pending"

  if (status === "rejected") {
    return (
      <div className="flex flex-col gap-6">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              <span className="text-sm font-semibold tracking-wide uppercase">
                Application Rejected
              </span>
            </div>
            <p className="text-sm text-foreground">
              {manufacturer?.rejection_reason ??
                "Your manufacturer application was not approved. Contact support for details."}
            </p>
            <div className="pt-1">
              <Button size="sm" render={<a href="mailto:paulpelumi@gmail.com" />}>
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === "approved") {
    return (
      <div className="flex flex-col gap-6">
        <Card className="border-success/30 bg-success/5">
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="size-5" />
              <span className="text-sm font-semibold tracking-wide uppercase">Approved</span>
            </div>
            <p className="text-sm text-foreground">
              {manufacturer?.company_name} is approved on VeriGuard. Machines, batch generation,
              and analytics arrive in the next modules of Phase 4.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const autoCheckResult = manufacturer?.auto_check_result as { passed?: boolean } | null
  const autoCheckLabel =
    autoCheckResult == null
      ? "Not run"
      : autoCheckResult.passed
        ? "Passed ✅"
        : "Requires Manual Review ⚠️"

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-warning/30 bg-warning/5">
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-warning">
            <Clock className="size-5" />
            <span className="text-sm font-semibold tracking-wide uppercase">
              Application Under Review
            </span>
          </div>
          <p className="text-sm text-foreground">
            Your manufacturer application is being reviewed by the VeriGuard team. You will
            receive an email once approved. Review typically takes 24&ndash;48 hours.
          </p>
          <p className="text-sm text-muted-foreground">Auto-check: {autoCheckLabel}</p>
        </CardContent>
      </Card>
    </div>
  )
}
