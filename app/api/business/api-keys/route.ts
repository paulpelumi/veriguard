import { NextResponse } from "next/server"

import { generateApiKey } from "@/lib/api-keys/api-key-manager"
import { getEffectivePlan } from "@/lib/payments/subscription-manager"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const MAX_ACTIVE_KEYS = 5

// Creation is the one operation in this module that can't just be a direct
// client-side Supabase insert guarded by RLS (unlike revoke, which is a
// plain update the owning user is already allowed to make) - the raw key
// has to be generated and hashed server-side so the secret is never
// visible anywhere except this one response, and the api_access plan gate
// has to be enforced somewhere the client can't bypass by skipping a UI
// check.
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: { message: "Unauthorized", code: "unauthorized" } }, { status: 401 })
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "business") {
    return NextResponse.json(
      { error: { message: "Only business accounts can create API keys", code: "wrong_role" } },
      { status: 403 }
    )
  }

  const plan = await getEffectivePlan(supabase, user.id, "business")
  const features = (plan?.features ?? {}) as Record<string, boolean>

  if (!features.api_access) {
    return NextResponse.json(
      {
        error: {
          message: "API access requires the Business Professional plan or higher.",
          code: "plan_required",
        },
      },
      { status: 403 }
    )
  }

  const body = await request.json().catch(() => null)
  const name = typeof body?.name === "string" ? body.name.trim() : ""

  if (!name) {
    return NextResponse.json(
      { error: { message: "Give this key a name", code: "invalid_request" } },
      { status: 400 }
    )
  }

  const serviceClient = createServiceRoleClient()

  const { count: activeCount } = await serviceClient
    .from("api_keys")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_active", true)

  if ((activeCount ?? 0) >= MAX_ACTIVE_KEYS) {
    return NextResponse.json(
      {
        error: {
          message: `You can have at most ${MAX_ACTIVE_KEYS} active API keys. Revoke one before creating another.`,
          code: "key_limit_reached",
        },
      },
      { status: 400 }
    )
  }

  const { rawKey, keyHash, keyPrefix } = generateApiKey()

  const { data: inserted, error: insertError } = await serviceClient
    .from("api_keys")
    .insert({
      user_id: user.id,
      name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      permissions: ["verify"],
      rate_limit_per_hour: 100,
    })
    .select("id, name, key_prefix, permissions, rate_limit_per_hour, calls_total, last_used_at, expires_at, is_active, created_at")
    .single()

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: { message: insertError?.message ?? "Could not create API key", code: "insert_failed" } },
      { status: 500 }
    )
  }

  return NextResponse.json({ key: inserted, rawKey })
}
