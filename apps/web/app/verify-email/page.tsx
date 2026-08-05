import { VerifyEmailForm } from "@/components/forms/verify-email-form"
import { PublicShell } from "@/components/layout/public-shell"

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const raw = await searchParams
  const email = Array.isArray(raw.email) ? raw.email[0] : raw.email

  return (
    <PublicShell>
      <section className="mx-auto flex max-w-7xl justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="w-full max-w-md rounded-3xl border bg-card p-8 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">
            Verify Email
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Confirm your address using the secure link sent by Supabase Auth.
          </p>
          <div className="mt-6">
            <VerifyEmailForm initialEmail={email ?? ""} />
          </div>
        </div>
      </section>
    </PublicShell>
  )
}
