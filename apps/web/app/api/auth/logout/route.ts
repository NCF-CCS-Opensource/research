import { type NextRequest, NextResponse } from "next/server"

import { createServerSupabase } from "@/lib/supabase-server"

export async function POST(request: NextRequest) {
  await (await createServerSupabase()).auth.signOut()
  return NextResponse.redirect(new URL("/", request.url))
}
