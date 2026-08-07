import { createHmac } from "node:crypto"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

export type LocalStatus = {
  API_URL: string
  PUBLISHABLE_KEY: string
  SECRET_KEY: string
  JWT_SECRET: string
}

function jwt(secret: string, subject: string, expiresIn = 60) {
  // Local-only signed session fixture for database authorization tests.
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
  const email = `${label}-${Date.now()}-${crypto.randomUUID()}@example.com`
  const password = "password123"
  const account = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (account.error) throw account.error
  const id = account.data.user.id
  const created = await service.from("profiles").insert({
    id,
    email,
    first_name: label,
    last_name: "Tester",
  })
  if (created.error) throw created.error
  const client = createClient(status.API_URL, status.PUBLISHABLE_KEY)
  const signedIn = await client.auth.signInWithPassword({ email, password })
  if (signedIn.error) throw signedIn.error
  return {
    client,
    email,
    id,
  }
}
