import { NextResponse, type NextRequest } from "next/server"

import { verifySerial } from "@/lib/serials/verify-service"
import { createClient } from "@/lib/supabase/server"
import { checkUsageLimit, recordUsage } from "@/lib/usage/usage-tracker"

export async function POST(request: NextRequest) {
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

  const body = await request.json().catch(() => null)
  const serial = typeof body?.serial === "string" ? body.serial.trim() : ""

  if (!serial) {
    return NextResponse.json(
      { error: { message: "Serial is required", code: "invalid_request" } },
      { status: 400 }
    )
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("state, lga, role")
    .eq("id", user.id)
    .maybeSingle()

  // Shares the same "verifications" quota as NAFDAC-number checks - both
  // are the same underlying action from a plan's perspective (a consumer
  // checking whether a product is genuine), so they draw from one pool
  // rather than each getting their own separate allowance.
  if (profile?.role && profile.role !== "admin") {
    const usage = await checkUsageLimit(supabase, user.id, profile.role, "verifications")
    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: {
            message: `You've used all ${usage.limit} free verifications this month. Upgrade to keep verifying.`,
            code: "limit_reached",
          },
        },
        { status: 403 }
      )
    }
  }

  try {
    const result = await verifySerial(supabase, serial, {
      state: profile?.state ?? null,
      lga: profile?.lga ?? null,
    })

    if (profile?.role && profile.role !== "admin") {
      await recordUsage(supabase, user.id, "verifications")
    }

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : "db_error", code: "db_error" } },
      { status: 500 }
    )
  }
}
