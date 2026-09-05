import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { requireAdminApi } from "@/lib/supabase/require-admin-api"

// Marks a verification anomaly resolved. The optional `note` field has no
// dedicated column on verification_anomalies (the spec's own table schema
// doesn't include one) - it's folded into the existing `details` jsonb
// column instead, which the table already carries for exactly this kind of
// flexible, non-structured extra data.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const authError = await requireAdminApi(supabase)
  if (authError) return authError

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
