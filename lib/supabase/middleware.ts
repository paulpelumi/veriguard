import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import type { Database } from "@/types/database"

const AUTH_ROUTES = ["/login", "/register"]
const PUBLIC_ROUTES = ["/", ...AUTH_ROUTES]

function homeForRole(role: string | undefined): string {
  if (role === "admin") return "/admin"
  if (role === "business") return "/business/dashboard"
  return "/consumer/dashboard"
}

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
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname)
  const isAuthRoute = AUTH_ROUTES.includes(pathname)
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
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_suspended")
      .eq("id", user.id)
      .single()

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

    const isAdminRoute = pathname.startsWith("/admin")
    const isBusinessRoute = pathname.startsWith("/business")
    const isConsumerRoute = pathname.startsWith("/consumer")
    const isAdmin = profile?.role === "admin"

    // Module 7: anyone accessing /admin/* without role = 'admin' is
    // redirected to their own dashboard. This is the real route-protection
    // layer - lib/supabase/require-admin.ts's page-level guard (added in
    // Module 6, before this existed) stays in place too as a convenience
    // for pulling the current user/session, not as the security boundary.
    if (isAdminRoute && !isAdmin) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.search = ""
      redirectUrl.pathname = homeForRole(profile?.role)
      return NextResponse.redirect(redirectUrl)
    }

    // An admin isn't a business or consumer, but nothing requires bouncing
    // them out of those areas if they navigate there directly - only the
    // actual business/consumer roles are mutually exclusive here.
    if (!isAdmin) {
      if (isBusinessRoute && profile?.role !== "business") {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.search = ""
        redirectUrl.pathname = "/consumer/dashboard"
        return NextResponse.redirect(redirectUrl)
      }

      if (isConsumerRoute && profile?.role !== "consumer") {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.search = ""
        redirectUrl.pathname = "/business/dashboard"
        return NextResponse.redirect(redirectUrl)
      }
    }
  }

  return supabaseResponse
}
