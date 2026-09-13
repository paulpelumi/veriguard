import { NextResponse } from "next/server"

import { sendApplicationReceivedEmail } from "@/lib/email/manufacturer-emails"
import { runManufacturerAutoCheck } from "@/lib/manufacturers/verification"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

// Called right after registration submits (and reusable later for a
// "Reapply" action, since it only ever reads/updates the caller's own
// manufacturer_profiles row). Runs the Greenbook auto-check, records the
// result, notifies the admin account, and emails the applicant - all
// server-side, since the notification write needs the service role (an
// applicant's own session can't insert a row into another user's
// notifications) and email sending needs RESEND_API_KEY, which only
// exists server-side.
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: { message: "Unauthorized", code: "unauthorized" } },
      { status: 401 }
    )
  }

  const { data: manufacturer, error: fetchError } = await supabase
    .from("manufacturer_profiles")
    .select("company_name")
    .eq("id", user.id)
    .maybeSingle()

  if (fetchError || !manufacturer) {
    return NextResponse.json(
      { error: { message: "Manufacturer profile not found", code: "not_found" } },
      { status: 404 }
    )
  }

  const autoCheck = await runManufacturerAutoCheck(manufacturer.company_name)

  // Per spec, both branches of the auto-check ("code provided and passed"
  // vs. "not provided or failed") land on the same status - every
  // application gets a human review during the pilot regardless of what
  // the automated check found; auto_check_result is what actually varies,
  // giving the reviewer a head start rather than a final answer.
  const { error: updateError } = await supabase
    .from("manufacturer_profiles")
    .update({
      auto_check_result: autoCheck as unknown as Record<string, unknown>,
      auto_checked_at: new Date().toISOString(),
      verification_status: "pending_manual",
    })
    .eq("id", user.id)

  if (updateError) {
    return NextResponse.json(
      { error: { message: updateError.message, code: "update_failed" } },
      { status: 500 }
    )
  }

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
        title: `New manufacturer application — ${manufacturer.company_name}`,
        message: `Auto-check ${autoCheck.passed ? "passed" : "failed"}. Documents uploaded. Manual review required.`,
        link: "/admin/manufacturers",
        metadata: { manufacturer_id: user.id, auto_check_passed: autoCheck.passed },
      })
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single()

  if (profile) {
    await sendApplicationReceivedEmail(profile.email, profile.full_name ?? "there", manufacturer.company_name)
  }

  return NextResponse.json({ auto_check: autoCheck })
}
