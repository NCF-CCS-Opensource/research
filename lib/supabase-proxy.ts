import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values) {
          values.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          values.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  const { pathname } = request.nextUrl
  const protectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/upload") ||
    pathname.startsWith("/admin")

  let profile: { role: "user" | "admin"; status: string } | null = null
  if (userId) {
    const result = await supabase
      .from("profiles")
      .select("role,status")
      .eq("id", userId)
      .maybeSingle()
    profile = result.data
  }

  if (protectedRoute && !profile) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  if (pathname.startsWith("/admin") && profile?.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  if (profile && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(
      new URL(profile.role === "admin" ? "/admin" : "/dashboard", request.url)
    )
  }

  return response
}
