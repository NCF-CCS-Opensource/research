import Link from "next/link"

import { RegisterForm } from "@/components/forms/register-form"
import { PublicShell } from "@/components/layout/public-shell"

export default function RegisterPage() {
  return (
    <PublicShell>
      <section className="mx-auto flex max-w-7xl justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-2xl rounded-3xl border bg-card p-8 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">
            Create Account
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Register with email and password. NCF details can be selected when
            available.
          </p>
          <div className="mt-6">
            <RegisterForm />
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Already registered?{" "}
            <Link
              href="/login"
              className="font-medium text-foreground hover:text-primary"
            >
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </PublicShell>
  )
}
