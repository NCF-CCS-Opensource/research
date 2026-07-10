"use client"

import Link from "next/link"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { clientAction } from "@/lib/client-api"

type PdfRequestResponse = {
  id: string
  status: string
}

export function PdfRequestForm({ researchId }: { researchId: string }) {
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    setMessage(null)
    setError(null)

    startTransition(async () => {
      try {
        const response = await clientAction<PdfRequestResponse>("/pdf-requests", "POST", {
          researchId,
          requestNote: form.get("requestNote"),
        })
        setMessage(`Request submitted. Status: ${response.status}.`)
        formElement.reset()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to submit PDF request")
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <label className="grid gap-2 text-sm">
        Request Note
        <textarea
          name="requestNote"
          rows={5}
          required
          minLength={1}
          maxLength={1000}
          className="rounded-lg border bg-background p-3"
        />
      </label>
      {message ? (
        <p className="rounded-lg bg-secondary p-3 text-sm">
          {message} <Link href={`/research/${researchId}`} className="font-medium underline">Back to research</Link>
        </p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={isPending}>{isPending ? "Submitting..." : "Submit request"}</Button>
    </form>
  )
}
