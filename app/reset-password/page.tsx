import { ResetPasswordForm } from "@/components/forms/reset-password-form"
import { PublicShell } from "@/components/layout/public-shell"

export default function ResetPasswordPage() {
  return (
    <PublicShell>
      <section className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-2xl font-semibold">Reset Password</h1>
        <div className="mt-6"><ResetPasswordForm /></div>
      </section>
    </PublicShell>
  )
}
