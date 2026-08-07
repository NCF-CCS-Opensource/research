"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { getSupabase } from "@/lib/supabase"

export function VerifyEmailForm({ initialEmail }: { initialEmail: string }) {
  const [message, setMessage] = useState(
    "Use the confirmation link sent to your email."
  )
  const [pending, startTransition] = useTransition()
  function resend() {
    startTransition(async () => {
      const { error } = await getSupabase().auth.resend({
        type: "signup",
        email: initialEmail,
        options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
      })
      setMessage(error?.message ?? "Confirmation email sent again.")
    })
  }
  return (
    <div className="grid gap-4">
      <p className="text-sm">{message}</p>
      <Button onClick={resend} disabled={pending || !initialEmail}>
        {pending ? "Sending..." : "Resend confirmation email"}
      </Button>
      <Link href="/login" className="text-center text-sm underline">
        Back to sign in
      </Link>
    </div>
  )
}
