import { after, NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { requireAdminApi as requireAdmin } from "@/lib/supabase/require-admin-api"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { notifyWhatsAppUsersOfRecall } from "@/lib/whatsapp/recall-notifier"
import type { Database, RecallSeverity } from "@/types/database"

type RecallAlertUpdate = Database["public"]["Tables"]["recall_alerts"]["Update"]

const VALID_SEVERITIES: RecallSeverity[] = ["low", "medium", "high", "critical"]

// CRUD for the admin recall management page (Module 7): view all scraped
// recalls, edit auto-detected ones, manually add recalls that weren't
// scraped, and deactivate false positives. Everything lives in this one
// file per the spec's file list - dispatched by HTTP method rather than
// split into a [id] route.
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const authError = await requireAdmin(supabase)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const activeParam = searchParams.get("active")
  const autoDetectedParam = searchParams.get("auto_detected")

  let query = supabase
    .from("recall_alerts")
    .select("*")
    .order("issued_date", { ascending: false, nullsFirst: false })

  if (activeParam === "true" || activeParam === "false") {
    query = query.eq("is_active", activeParam === "true")
  }
  if (autoDetectedParam === "true" || autoDetectedParam === "false") {
    query = query.eq("auto_detected", autoDetectedParam === "true")
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json(
      { error: { message: error.message, code: "query_failed" } },
      { status: 500 }
    )
  }
  return NextResponse.json({ recalls: data })
}

// Manually add a recall that wasn't scraped.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const authError = await requireAdmin(supabase)
  if (authError) return authError

  const body = await request.json().catch(() => null)
  const productName = typeof body?.product_name === "string" ? body.product_name.trim() : ""
  if (!productName) {
    return NextResponse.json(
      { error: { message: "product_name is required", code: "invalid_request" } },
      { status: 400 }
    )
  }
  const severity =
    typeof body?.severity === "string" && VALID_SEVERITIES.includes(body.severity as RecallSeverity)
      ? (body.severity as RecallSeverity)
      : "medium"

  const { data, error } = await supabase
    .from("recall_alerts")
    .insert({
      product_name: productName,
      nafdac_number: typeof body?.nafdac_number === "string" ? body.nafdac_number.trim() || null : null,
      company_name: typeof body?.company_name === "string" ? body.company_name.trim() || null : null,
      recall_reason: typeof body?.recall_reason === "string" ? body.recall_reason.trim() || null : null,
      severity,
      issued_date: typeof body?.issued_date === "string" ? body.issued_date : null,
      is_active: true,
      auto_detected: false,
    })
    .select("*")
    .single()

  if (error) {
    return NextResponse.json(
      { error: { message: error.message, code: "insert_failed" } },
      { status: 500 }
    )
  }

  // after() (not a bare fire-and-forget promise) because Vercel's
  // serverless runtime can freeze/terminate a function the moment its
  // response is sent - a detached promise here could get cut off mid-send
  // before any WhatsApp message actually goes out. after() keeps the
  // function alive until this resolves while still returning the response
  // to the admin immediately, so recall creation itself never waits on a
  // stalled or failed WhatsApp push (most likely an unapproved/
  // misconfigured template - see recall-notifier.ts's own comment).
  after(() =>
    notifyWhatsAppUsersOfRecall(createServiceRoleClient(), data).catch((notifyError) => {
      console.error("[admin/recalls] WhatsApp recall notification failed", notifyError)
    })
  )

  return NextResponse.json({ recall: data }, { status: 201 })
}

// Edit an existing recall (correct product name/severity/company on an
// auto-detected entry, or toggle is_active to deactivate a false positive).
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const authError = await requireAdmin(supabase)
  if (authError) return authError

  const body = await request.json().catch(() => null)
  const id = typeof body?.id === "string" ? body.id : ""
  if (!id) {
    return NextResponse.json(
      { error: { message: "id is required", code: "invalid_request" } },
      { status: 400 }
    )
  }

  const updates: RecallAlertUpdate = {}
  if (typeof body?.product_name === "string") updates.product_name = body.product_name.trim()
  if (typeof body?.company_name === "string") updates.company_name = body.company_name.trim() || null
  if (typeof body?.recall_reason === "string") updates.recall_reason = body.recall_reason.trim() || null
  if (typeof body?.nafdac_number === "string") updates.nafdac_number = body.nafdac_number.trim() || null
  if (typeof body?.issued_date === "string") updates.issued_date = body.issued_date
  if (typeof body?.is_active === "boolean") updates.is_active = body.is_active
  if (typeof body?.severity === "string" && VALID_SEVERITIES.includes(body.severity as RecallSeverity)) {
    updates.severity = body.severity
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: { message: "No valid fields to update", code: "invalid_request" } },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from("recall_alerts")
    .update(updates)
    .eq("id", id)
    .select("*")
    .maybeSingle()

  if (error) {
    return NextResponse.json(
      { error: { message: error.message, code: "update_failed" } },
      { status: 500 }
    )
  }
  if (!data) {
    return NextResponse.json(
      { error: { message: "Recall not found", code: "not_found" } },
      { status: 404 }
    )
  }
  return NextResponse.json({ recall: data })
}
