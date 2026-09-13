import type { SupabaseClient } from "@supabase/supabase-js"

import { sendApplicationReceivedEmail } from "@/lib/email/manufacturer-emails"
import { runManufacturerAutoCheck, type AutoCheckResult } from "@/lib/manufacturers/verification"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import type { Database } from "@/types/database"

// Shared by both the initial registration route (no session yet - signup
// may still be pending email confirmation) and /api/manufacturers/verify
// (an already-logged-in manufacturer re-running the check). Runs the
// Greenbook auto-check, records the result, notifies the admin account,
// and emails the applicant. The notification write always needs the
// service role regardless of which client updated the row, since it
// writes to the ADMIN's notifications, not the caller's own.
export async function runAutoCheckAndNotify(
  supabase: SupabaseClient<Database>,
  userId: string,
  companyName: string
): Promise<AutoCheckResult> {
  const autoCheck = await runManufacturerAutoCheck(companyName)

  await supabase
    .from("manufacturer_profiles")
    .update({
      auto_check_result: autoCheck as unknown as Record<string, unknown>,
      auto_checked_at: new Date().toISOString(),
      verification_status: "pending_manual",
    })
    .eq("id", userId)

  const serviceClient = createServiceRoleClient()
  const adminEmail = process.env.ADMIN_EMAIL

  if (adminEmail) {
    const { data: admin } = await serviceClient
      .from("profiles")
      .select("id")
      .eq("email", adminEmail)
      .maybeSingle()

    if (admin) {
      await serviceClient.from("notifications").insert({
        user_id: admin.id,
        type: "manufacturer_application",
        title: `New manufacturer application — ${companyName}`,
        message: `Auto-check ${autoCheck.passed ? "passed" : "failed"}. Documents uploaded. Manual review required.`,
        link: "/admin/manufacturers",
        metadata: { manufacturer_id: userId, auto_check_passed: autoCheck.passed },
      })
    }
  }

  const { data: profile } = await serviceClient
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .maybeSingle()

  if (profile) {
    await sendApplicationReceivedEmail(profile.email, profile.full_name ?? "there", companyName)
  }

  return autoCheck
}
