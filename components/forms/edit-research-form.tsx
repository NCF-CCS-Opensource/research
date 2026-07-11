"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { clientAction, clientEnvelope } from "@/lib/client-api"
import type { ResearchDetail } from "@/types/api"

export function EditResearchForm({ id }: { id: string }) {
  const router = useRouter()
  const [research, setResearch] = useState<ResearchDetail | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    clientEnvelope<ResearchDetail>(`/research/${id}`)
      .then(setResearch)
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : "Failed to load"))
  }, [id])

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setError(null)

    startTransition(async () => {
      try {
        await clientAction(`/research/${id}`, "PATCH", {
          title: form.get("title"),
          abstract: form.get("abstract"),
          publishDate: form.get("publishDate") || undefined,
        })
        router.push("/dashboard/papers")
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Update failed")
      }
    })
  }

  if (loadError) {
    return <p className="text-sm text-destructive">{loadError}</p>
  }

  if (!research) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }

  if (research.status === "approved") {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Approved papers cannot be edited. Contact an admin if changes are needed.
      </div>
    )
  }

  const publishDateValue = research.publishDate
    ? new Date(research.publishDate).toISOString().split("T")[0]
    : ""

  return (
    <form onSubmit={onSubmit} className="grid max-w-2xl gap-5">
      <label className="grid gap-2 text-sm font-medium">
        Title
        <input
          name="title"
          required
          defaultValue={research.title}
          className="h-10 rounded-lg border bg-background px-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </label>

      <label className="grid gap-2 text-sm font-medium">
        Abstract
        <textarea
          name="abstract"
          required
          rows={7}
          defaultValue={research.abstract ?? ""}
          className="rounded-lg border bg-background p-3 text-sm leading-6 transition-colors focus:outline-none focus:ring-2 focus:ring-ring resize-y"
        />
      </label>

      <label className="grid gap-2 text-sm font-medium">
        Publish Date
        <input
          name="publishDate"
          type="date"
          defaultValue={publishDateValue}
          className="h-10 rounded-lg border bg-background px-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </label>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save changes"}
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/dashboard/papers">Cancel</Link>
        </Button>
      </div>
    </form>
  )
}
