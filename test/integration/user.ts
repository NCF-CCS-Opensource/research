import { createHmac } from "node:crypto"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

export type LocalStatus = {
  API_URL: string
  PUBLISHABLE_KEY: string
  SECRET_KEY: string
  JWT_SECRET: string
}

function jwt(secret: string, subject: string, expiresIn = 60) {
  // Local-only Clerk-shaped session fixture; real Clerk OAuth/native trust stays manual.
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url")
  const unsigned = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({
    sub: subject,
    role: "authenticated",
    exp: Math.floor(Date.now() / 1000) + expiresIn,
  })}`
  const signature = createHmac("sha256", secret)
    .update(unsigned)
    .digest("base64url")
  return `${unsigned}.${signature}`
}

export function authenticatedClient(
  status: LocalStatus,
  id: string,
  expiresIn = 60
) {
  return createClient(status.API_URL, status.PUBLISHABLE_KEY, {
    accessToken: async () => jwt(status.JWT_SECRET, id, expiresIn),
  })
}

export async function user(
  service: SupabaseClient,
  status: LocalStatus,
  label: string
) {
  const id = `user_${crypto.randomUUID()}`
  const email = `${label}-${Date.now()}-${crypto.randomUUID()}@example.com`
  const created = await service.from("profiles").insert({
    id,
    email,
    first_name: label,
    last_name: "Tester",
  })
  if (created.error) throw created.error
  return {
    client: authenticatedClient(status, id),
    email,
    id,
  }
}
