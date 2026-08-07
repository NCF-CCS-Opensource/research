import { VerifyEmailForm } from "@/components/forms/verify-email-form"
import { PublicShell } from "@/components/layout/public-shell"

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const value = (await searchParams).email
  const email = Array.isArray(value) ? value[0] : value
  return <PublicShell><section className="mx-auto max-w-md px-4 py-16"><h1 className="text-2xl font-semibold">Verify Email</h1><p className="mt-2 text-sm text-muted-foreground">Confirm your address using the secure link sent by Supabase Auth.</p><div className="mt-6"><VerifyEmailForm initialEmail={email ?? ""} /></div></section></PublicShell>
}
