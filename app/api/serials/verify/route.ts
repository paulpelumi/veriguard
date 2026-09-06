import { NextResponse, type NextRequest } from "next/server"

import { verifySerial } from "@/lib/serials/verify-service"
import { createClient } from "@/lib/supabase/server"

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
    .select("state, lga")
    .eq("id", user.id)
    .maybeSingle()

  try {
    const result = await verifySerial(supabase, serial, {
      state: profile?.state ?? null,
      lga: profile?.lga ?? null,
    })
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : "db_error", code: "db_error" } },
      { status: 500 }
    )
  }
}
