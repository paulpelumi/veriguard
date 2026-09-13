import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { homeForRole } from "@/lib/utils/role-routing"

// A first-time OAuth sign-in has last_sign_in_at within moments of
// created_at - profiles.role was just defaulted to 'consumer' by
// handle_new_user's trigger (0001_init.sql), since Google's user metadata
// carries no "role" key the way the manual signup forms pass one
// explicitly. A returning sign-in's gap is however long it's been since
// they first signed up.
const FIRST_SIGN_IN_WINDOW_MS = 10_000

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
  }

  const createdAt = new Date(data.user.created_at).getTime()
  const lastSignInAt = data.user.last_sign_in_at ? new Date(data.user.last_sign_in_at).getTime() : createdAt
  const isFirstSignIn = lastSignInAt - createdAt < FIRST_SIGN_IN_WINDOW_MS

  if (isFirstSignIn) {
    return NextResponse.redirect(`${origin}/onboarding/role`)
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle()
  return NextResponse.redirect(`${origin}${homeForRole(profile?.role)}`)
}
