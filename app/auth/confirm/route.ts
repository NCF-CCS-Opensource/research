import { type EmailOtpType } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"

import { createServerSupabase } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash")
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null
  const next = request.nextUrl.searchParams.get("next")
  const destination =
    next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard"

  if (tokenHash && type) {
    const supabase = await createServerSupabase()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) return NextResponse.redirect(new URL(destination, request.url))
  }

  return NextResponse.redirect(new URL("/login?error=confirmation", request.url))
}
