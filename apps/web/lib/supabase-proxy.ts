import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"

import { authDestination, type ProfileAccess } from "@/lib/auth-routing"

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseKey) return response

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
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
  })
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub ?? null
  const profile = userId
    ? ((await supabase.rpc("get_current_profile_access").maybeSingle())
        .data as ProfileAccess | null)
    : null
  if (userId && !profile) await supabase.auth.signOut()
  const destination = authDestination(
    request.nextUrl.pathname,
    userId,
    profile,
    `${request.nextUrl.pathname}${request.nextUrl.search}`
  )

  return destination
    ? NextResponse.redirect(new URL(destination, request.url))
    : response
}
