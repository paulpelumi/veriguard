import { NextResponse, type NextRequest } from "next/server"

import { hashApiKey } from "@/lib/api-keys/api-key-manager"
import { detectScanFormat } from "@/lib/nafdac/format-detector"
import { verifyNafdacNumber } from "@/lib/nafdac/verify-service"
import { verifySerial } from "@/lib/serials/verify-service"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { checkUsageLimit, recordUsage } from "@/lib/usage/usage-tracker"
import type { NafdacVerificationResult, SerialVerificationResult } from "@/types"

function errorResponse(message: string, code: string, status: number) {
  return NextResponse.json({ error: { message, code } }, { status })
}

// Deliberately no CORS headers - this authenticates with a long-lived
// secret key, not a session cookie, so it's meant for server-to-server use
// only. Adding Access-Control-Allow-Origin would actively invite embedding
// the key in browser JS, where anyone viewing page source could steal it.
//
// Same "verifications" billing rules as the web routes
// (app/api/nafdac/verify, app/api/serials/verify), just under its own
// api_calls metric/limit instead - a third party's usage draws from the
// business's api_calls quota, not their monthly_verifications one.
const BILLABLE_NAFDAC_STATUSES = new Set(["verified", "verified_with_warnings", "not_found"])

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const rawKey = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null

  if (!rawKey) {
    return errorResponse(
      "Missing API key. Send it as: Authorization: Bearer <your-api-key>",
      "unauthorized",
      401
    )
  }

  const serviceClient = createServiceRoleClient()
  const keyHash = hashApiKey(rawKey)

  const { data: apiKey } = await serviceClient
    .from("api_keys")
    .select("id, user_id, permissions, rate_limit_per_hour, is_active, expires_at, calls_total")
    .eq("key_hash", keyHash)
    .maybeSingle()

  if (!apiKey || !apiKey.is_active) {
    return errorResponse("Invalid or revoked API key.", "invalid_key", 401)
  }

  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
    return errorResponse("This API key has expired.", "key_expired", 401)
  }

  if (!apiKey.permissions.includes("verify")) {
    return errorResponse("This API key doesn't have verify permission.", "forbidden", 403)
  }

  const withinRateLimit = await serviceClient.rpc("api_key_check_rate_limit", {
    p_key_id: apiKey.id,
    p_limit: apiKey.rate_limit_per_hour,
  })

  if (withinRateLimit.error || withinRateLimit.data === false) {
    return errorResponse(
      `Rate limit exceeded (${apiKey.rate_limit_per_hour} requests/hour). Try again shortly.`,
      "rate_limited",
      429
    )
  }

  const usage = await checkUsageLimit(serviceClient, apiKey.user_id, "business", "api_calls")
  if (!usage.allowed) {
    return errorResponse(
      `Monthly API call limit reached (${usage.limit}). Upgrade your plan for more.`,
      "limit_reached",
      403
    )
  }

  const query = request.nextUrl.searchParams.get("q")?.trim()
  if (!query) {
    return errorResponse(
      "Provide a NAFDAC number or VeriGuard serial code via ?q=",
      "invalid_request",
      400
    )
  }

  const format = detectScanFormat(query)
  const { id: keyId, user_id: keyUserId, calls_total: callsTotal } = apiKey

  async function touchKey() {
    await recordUsage(serviceClient, keyUserId, "api_calls")
    await serviceClient
      .from("api_keys")
      .update({ calls_total: callsTotal + 1, last_used_at: new Date().toISOString() })
      .eq("id", keyId)
  }

  if (format === "nafdac_number") {
    const result: NafdacVerificationResult = await verifyNafdacNumber(serviceClient, {
      rawNumber: query,
      userId: apiKey.user_id,
      source: "api",
    })

    if (BILLABLE_NAFDAC_STATUSES.has(result.status)) {
      await touchKey()
    }

    return NextResponse.json(result, { status: result.status === "invalid_format" ? 400 : 200 })
  }

  if (format === "veriguard_serial") {
    const result: SerialVerificationResult = await verifySerial(
      serviceClient,
      query,
      { state: null, lga: null },
      "api"
    )
    await touchKey()
    return NextResponse.json(result)
  }

  return errorResponse(
    "Couldn't identify that value as a NAFDAC number or VeriGuard serial code.",
    "invalid_format",
    400
  )
}
