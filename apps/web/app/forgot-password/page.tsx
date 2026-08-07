import { ForgotPasswordForm } from "@/components/forms/forgot-password-form"
import { PublicShell } from "@/components/layout/public-shell"

export default function ForgotPasswordPage() {
  return <PublicShell><section className="mx-auto max-w-md px-4 py-16"><h1 className="text-2xl font-semibold">Forgot Password</h1><p className="mt-2 text-sm text-muted-foreground">Enter your email to receive a secure password reset link.</p><div className="mt-6"><ForgotPasswordForm /></div></section></PublicShell>
}
