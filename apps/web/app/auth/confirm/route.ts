import type { EmailOtpType } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"

import { safeNextPath } from "@/lib/safe-next-path"
import { createServerSupabase } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash")
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null
  const destination = safeNextPath(request.nextUrl.searchParams.get("next"), "/dashboard")
  if (tokenHash && type) {
    const { error } = await (await createServerSupabase()).auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) return NextResponse.redirect(new URL(destination, request.url))
  }
  return NextResponse.redirect(new URL("/login?error=confirmation", request.url))
}
