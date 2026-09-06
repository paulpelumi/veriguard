import { createClient as createSupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/database"

// For server-only code that has no user session to work with at all - the
// WhatsApp webhook (Module 8) is called directly by Meta's servers with no
// cookies, so lib/supabase/server.ts's cookie-based client can't apply
// (there's no request/response cycle carrying a browser's session). This
// bypasses RLS entirely, exactly like every Edge Function in this project
// already does with SUPABASE_SERVICE_ROLE_KEY - never import this into
// client-facing code or a route that has an actual user session to use
// instead.
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY - required for service-role access."
    )
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
