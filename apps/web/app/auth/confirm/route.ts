import type { EmailOtpType } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"

import { safeNextPath } from "@/lib/safe-next-path"
import { createServerSupabase } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const tokenHash = request.nextUrl.searchParams.get("token_hash")
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null
  const auth = (await createServerSupabase()).auth
  let confirmedFlow: "signup" | "recovery" | null = null

  if (code) {
    const { data, error } = await auth.exchangeCodeForSession(code)
    if (!error)
      confirmedFlow =
        "redirectType" in data && data.redirectType === "recovery"
          ? "recovery"
          : "signup"
  } else if (tokenHash && type) {
    const { error } = await auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) confirmedFlow = type === "recovery" ? "recovery" : "signup"
  }

  if (confirmedFlow) {
    const destination =
      confirmedFlow === "recovery"
        ? safeNextPath(
            request.nextUrl.searchParams.get("next"),
            "/reset-password"
          )
        : "/dashboard"
    return NextResponse.redirect(new URL(destination, request.url))
  }

  return NextResponse.redirect(
    new URL("/login?error=confirmation", request.url)
  )
}
