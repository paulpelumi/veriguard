import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { homeForRole, roleAreaForPath } from "@/lib/utils/role-routing"
import type { Database } from "@/types/database"

const AUTH_ROUTES = ["/login", "/register"]
// Exact-match public pages, plus a prefix for the dynamic public share
// route (/verify/[nafdacNumber]) - these were missed when this list was
// first written (Phase 1) and stayed missed through every later addition
// (Module 8's /privacy, this module's /offline, and Global Improvement 2's
// /verify/[nafdacNumber]), so each silently required a login the entire
// time despite being built as public pages. /register/manufacturer needs
// its own auth-route treatment too (see below) since it's nested under
// /register but is itself a public, pre-login page.
const PUBLIC_ROUTES = ["/", "/privacy", "/offline", "/report", ...AUTH_ROUTES]
const PUBLIC_PREFIXES = ["/verify/", "/register/"]
// /register/manufacturer is deliberately NOT an "auth route" for the
// redirect-away-if-already-logged-in check below, unlike every other
// /register/* path - the OAuth role picker (app/onboarding/role) sends an
// already-authenticated manufacturer candidate here, since Google
// sign-in has no account-creation step for this wizard's Step 1 to
// replace. Redirecting them away before they ever see the form would
// silently break that entire path.
const MANUFACTURER_REGISTER_ROUTE = "/register/manufacturer"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isPublicRoute =
    PUBLIC_ROUTES.includes(pathname) || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  const isAuthRoute =
    AUTH_ROUTES.includes(pathname) ||
    (pathname.startsWith("/register/") && pathname !== MANUFACTURER_REGISTER_ROUTE)
  const isApiRoute = pathname.startsWith("/api/")

  // API routes return JSON to fetch() callers, not pages - redirecting them
  // to /login would hand back an HTML document instead. Let the request
  // through and let each route handler enforce its own auth check.
  if (isApiRoute) {
    return supabaseResponse
  }

  if (!user && !isPublicRoute) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.search = ""
    redirectUrl.pathname = "/login"
    redirectUrl.searchParams.set("redirectTo", pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (user && (isAuthRoute || !isPublicRoute)) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, is_suspended")
      .eq("id", user.id)
      .single()

    // A failed lookup (RLS misconfigured, a pending migration, a transient
    // error) must never be treated as "role matched nothing" - the
    // business/consumer mutual-exclusion redirects below would otherwise
    // bounce every request back and forth forever, since neither branch's
    // condition (role !== "business" / role !== "consumer") can ever be
    // false for an undefined role. Letting the request through unmodified
    // is safe: the destination page's own auth check still applies.
    if (profileError || !profile) {
      return supabaseResponse
    }

    // Module 7: a suspended account is signed out on its very next request,
    // regardless of which page it was headed to - the cookie session would
    // otherwise stay valid until it naturally expired.
    if (profile?.is_suspended) {
      await supabase.auth.signOut()
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.search = ""
      redirectUrl.pathname = "/login"
      redirectUrl.searchParams.set("suspended", "1")
      return NextResponse.redirect(redirectUrl)
    }

    if (isAuthRoute) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.search = ""
      redirectUrl.pathname = homeForRole(profile?.role)
      return NextResponse.redirect(redirectUrl)
    }

    // Generic role-area guard (Phase 4): every dashboard area belongs to
    // exactly one role (roleAreaForPath), and anyone whose actual role
    // doesn't match the area they're in gets sent to their own home. One
    // rule for all four roles instead of a pairwise check per role, which
    // is what caused Phase 3's infinite redirect loop the first time a
    // third role (admin) showed up against code that only knew about two.
    const currentArea = roleAreaForPath(pathname)
    if (currentArea && profile.role !== currentArea) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.search = ""
      redirectUrl.pathname = homeForRole(profile.role)
      return NextResponse.redirect(redirectUrl)
    }
  }

  return supabaseResponse
}
