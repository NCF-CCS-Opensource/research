"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { getSupabase } from "@/lib/supabase"

export function ForgotPasswordForm() {
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const email = String(new FormData(event.currentTarget).get("email"))
    startTransition(async () => {
      const { error: cause } = await getSupabase().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password` })
      if (cause) setError(cause.message)
      else setMessage("Check your email for the password reset link.")
    })
  }
  return <form onSubmit={onSubmit} className="grid gap-4"><label className="grid gap-2 text-sm">Email<input name="email" type="email" required className="h-10 rounded-lg border px-3" /></label><Button disabled={pending}>Send reset link</Button>{message ? <p className="text-sm">{message}</p> : null}{error ? <p className="text-sm text-destructive">{error}</p> : null}</form>
}
