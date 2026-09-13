import { NextResponse } from "next/server"

import { runAutoCheckAndNotify } from "@/lib/manufacturers/process-application"
import { createClient } from "@/lib/supabase/server"

// Reapply action for an already-logged-in manufacturer: reruns the
// Greenbook auto-check against their own manufacturer_profiles row. The
// initial run at signup goes through app/api/manufacturers/register
// instead, since that has to work before a session necessarily exists
// (email confirmation may still be pending).
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

  const autoCheck = await runAutoCheckAndNotify(supabase, user.id, manufacturer.company_name)

  return NextResponse.json({ auto_check: autoCheck })
}
