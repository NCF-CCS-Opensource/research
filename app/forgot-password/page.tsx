import { ForgotPasswordForm } from "@/components/forms/forgot-password-form"
import { PublicShell } from "@/components/layout/public-shell"

export default function ForgotPasswordPage() {
  return (
    <PublicShell>
      <section className="mx-auto flex max-w-7xl justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="w-full max-w-md rounded-3xl border bg-card p-8 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Forgot Password</h1>
          <p className="mt-2 text-sm text-muted-foreground">Enter your email to receive a secure password reset link.</p>
          <div className="mt-6"><ForgotPasswordForm /></div>
        </div>
      </section>
    </PublicShell>
  )
}
