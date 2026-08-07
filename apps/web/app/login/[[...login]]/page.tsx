import { SignIn } from "@clerk/nextjs"
import { BookOpenText } from "lucide-react"

import { PublicShell } from "@/components/layout/public-shell"
import { safeNextPath } from "@/lib/safe-next-path"
import { enforceProfileRoute } from "@/lib/profile-routing"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  await enforceProfileRoute("/login")
  const next = (await searchParams).next
  const destination = safeNextPath(next ?? null, "/login")

  return (
    <PublicShell>
      <section className="archive-grid mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="animate-fade-up w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <span className="flex size-12 items-center justify-center bg-primary text-primary-foreground shadow-[5px_5px_0_var(--accent)]">
              <BookOpenText className="size-5" />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-semibold tracking-tight">
                Welcome back
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Sign in to continue your research.
              </p>
            </div>
          </div>

          <SignIn
            routing="path"
            path="/login"
            withSignUp
            fallbackRedirectUrl={destination}
          />
        </div>
      </section>
    </PublicShell>
  )
}
