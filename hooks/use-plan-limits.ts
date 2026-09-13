"use client"

import { useEffect, useState } from "react"

import { getEffectivePlan } from "@/lib/payments/subscription-manager"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/types/database"

type BillableRole = Database["public"]["Tables"]["subscription_plans"]["Row"]["role"]

// getEffectivePlan is written against the generic SupabaseClient<Database>
// type, not specifically the server client - it already reads only
// RLS-permitted rows (a user's own user_subscriptions row, and the
// publicly-readable subscription_plans table), so it works unchanged from
// the browser client here instead of needing a dedicated API route.
export function usePlanLimits(userId: string | null, role: BillableRole | null) {
  const [limits, setLimits] = useState<Record<string, number> | null>(null)

  useEffect(() => {
    if (!userId || !role) return
    const supabase = createClient()
    let cancelled = false

    getEffectivePlan(supabase, userId, role).then((plan) => {
      if (!cancelled) setLimits((plan?.limits as Record<string, number>) ?? null)
    })

    return () => {
      cancelled = true
    }
  }, [userId, role])

  return limits
}
