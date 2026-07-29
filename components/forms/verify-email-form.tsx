"use client"

import Link from "next/link"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { getSupabase } from "@/lib/supabase"

export function VerifyEmailForm({ initialEmail }: { initialEmail: string }) {
  const [message, setMessage] = useState("Use the confirmation link sent to your email.")
  const [isPending, startTransition] = useTransition()

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
      <p className="rounded-lg bg-secondary p-3 text-sm">{message}</p>
      <Button onClick={resend} disabled={isPending || !initialEmail}>
        {isPending ? "Sending..." : "Resend confirmation email"}
      </Button>
      <Link href="/login" className="text-center text-sm font-medium underline">Back to sign in</Link>
    </div>
  )
}
