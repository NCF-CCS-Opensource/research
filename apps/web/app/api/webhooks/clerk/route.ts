import { verifyWebhook } from "@clerk/nextjs/webhooks"
import { createClient } from "@supabase/supabase-js"
import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  let event: Awaited<ReturnType<typeof verifyWebhook>>

  try {
    event = await verifyWebhook(request)
  } catch {
    return new Response("Invalid webhook signature", { status: 400 })
  }

  if (event.type !== "user.updated") return new Response("OK")

  const { id, updated_at, primary_email_address_id, email_addresses } =
    event.data
  const primaryEmail = email_addresses?.find(
    (email) => email.id === primary_email_address_id
  )

  if (
    !id ||
    !Number.isSafeInteger(updated_at) ||
    updated_at <= 0 ||
    !primaryEmail?.email_address ||
    primaryEmail.verification?.status !== "verified"
  ) {
    return new Response("Malformed user.updated event", { status: 400 })
  }

  const { error } = await createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
    .from("profiles")
    .update({
      email: primaryEmail.email_address,
      clerk_email_updated_at: updated_at,
    })
    .eq("id", id)
    .lt("clerk_email_updated_at", updated_at)

  return error
    ? new Response("Unable to update Profile", { status: 500 })
    : new Response("OK")
}
