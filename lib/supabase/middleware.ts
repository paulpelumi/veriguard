import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import type { Database } from "@/types/database"

const AUTH_ROUTES = ["/login", "/register"]
const PUBLIC_ROUTES = ["/", ...AUTH_ROUTES]

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

  if (!user && !isPublicRoute) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/login"
    redirectUrl.searchParams.set("redirectTo", pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (user && isAuthRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname =
      profile?.role === "business" ? "/business/dashboard" : "/consumer/dashboard"
    return NextResponse.redirect(redirectUrl)
  }

  if (user && !isPublicRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    const isBusinessRoute = pathname.startsWith("/business")
    const isConsumerRoute = pathname.startsWith("/consumer")

    if (isBusinessRoute && profile?.role !== "business") {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = "/consumer/dashboard"
      return NextResponse.redirect(redirectUrl)
    }

    if (isConsumerRoute && profile?.role !== "consumer") {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = "/business/dashboard"
      return NextResponse.redirect(redirectUrl)
    }
  }

  return supabaseResponse
}
