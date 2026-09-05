import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"

// Marks a verification anomaly resolved. The optional `note` field has no
// dedicated column on verification_anomalies (the spec's own table schema
// doesn't include one) - it's folded into the existing `details` jsonb
// column instead, which the table already carries for exactly this kind of
// flexible, non-structured extra data.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

  const { data: isAdmin } = await supabase.rpc("is_admin")
  if (!isAdmin) {
    return NextResponse.json(
      { error: { message: "Admin access required", code: "forbidden" } },
      { status: 403 }
    )
  }

  const body = await request.json().catch(() => null)
  const note = typeof body?.note === "string" && body.note.trim() ? body.note.trim() : undefined

  const { data: existing, error: fetchError } = await supabase
    .from("verification_anomalies")
    .select("details")
    .eq("id", id)
    .maybeSingle()

  if (fetchError || !existing) {
    return NextResponse.json(
      { error: { message: "Anomaly not found", code: "not_found" } },
      { status: 404 }
    )
  }

  const details = { ...(existing.details as Record<string, unknown> | null), resolution_note: note }

  const { data, error } = await supabase
    .from("verification_anomalies")
    .update({ is_resolved: true, resolved_at: new Date().toISOString(), details })
    .eq("id", id)
    .select("*")
    .maybeSingle()

  if (error) {
    return NextResponse.json(
      { error: { message: error.message, code: "update_failed" } },
      { status: 500 }
    )
  }

  return NextResponse.json({ anomaly: data })
}
