"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { discovery, researchLifecycle } from "@/lib/web-transport"
import type { ResearchDetail } from "@repo/api-client"
import { MultiCheckbox } from "@/components/forms/upload-research-form"

export function EditResearchForm({ id }: { id: string }) {
  const router = useRouter()
  const [research, setResearch] = useState<ResearchDetail | null>(null)
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string }>
  >([])
  const [keywords, setKeywords] = useState<Array<{ id: string; name: string }>>(
    []
  )
  const [loadError, setLoadError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    Promise.all([
      researchLifecycle.getOwnerRecord(id),
      discovery.getCategories(),
      discovery.getKeywords(),
    ])
      .then(([paper, categoryOptions, keywordOptions]) => {
        setResearch(paper)
        setCategories(categoryOptions)
        setKeywords(keywordOptions)
      })
      .catch((err: unknown) =>
        setLoadError(err instanceof Error ? err.message : "Failed to load")
      )
  }, [id])

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setError(null)

    startTransition(async () => {
      try {
        await researchLifecycle.updateRecord(id, {
          title: String(form.get("title")),
          abstract: String(form.get("abstract")),
          publishDate: String(form.get("publishDate") || ""),
          authors: String(form.get("authors") ?? "")
            .split("\n")
            .map((name) => name.trim())
            .filter(Boolean)
            .map((name) => ({ name })),
          categoryIds: form.getAll("categoryIds").map(String),
          keywordIds: form.getAll("keywordIds").map(String),
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
        Approved papers cannot be edited. Contact an admin if changes are
        needed.
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
          className="h-10 rounded-lg border bg-background px-3 text-sm transition-colors focus:ring-2 focus:ring-ring focus:outline-none"
        />
      </label>

      <label className="grid gap-2 text-sm font-medium">
        Abstract
        <textarea
          name="abstract"
          required
          rows={7}
          defaultValue={research.abstract ?? ""}
          className="resize-y rounded-lg border bg-background p-3 text-sm leading-6 transition-colors focus:ring-2 focus:ring-ring focus:outline-none"
        />
      </label>

      <label className="grid gap-2 text-sm font-medium">
        Publish Date
        <input
          name="publishDate"
          type="date"
          defaultValue={publishDateValue}
          className="h-10 rounded-lg border bg-background px-3 text-sm transition-colors focus:ring-2 focus:ring-ring focus:outline-none"
        />
      </label>

      <label className="grid gap-2 text-sm font-medium">
        Authors
        <textarea
          name="authors"
          required
          rows={4}
          defaultValue={research.authors?.map(({ name }) => name).join("\n")}
          className="rounded-lg border bg-background p-3 text-sm"
        />
      </label>

      <MultiCheckbox
        legend="Categories"
        items={categories}
        name="categoryIds"
        selectedIds={research.categories?.map(({ id }) => id)}
      />
      <MultiCheckbox
        legend="Keywords"
        items={keywords}
        name="keywordIds"
        selectedIds={research.keywords?.map(({ id }) => id)}
      />

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
