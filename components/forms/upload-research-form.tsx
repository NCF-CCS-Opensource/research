"use client"

import { useState, useTransition, useEffect } from "react"

import { Button } from "@/components/ui/button"
import { clientAction, clientPublicGet } from "@/lib/client-api"
import { uploadResearchPdf } from "@/lib/upload-research-pdf"

type CreatedResearch = { id: string }
type Option = { id: string; name: string }
type FailedUpload = { researchId: string; file: File; resumeKey?: string }

function MultiCheckbox({
  legend,
  items,
  name,
}: {
  legend: string
  items: Option[]
  name: string
}) {
  if (!items.length) return null
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <label key={item.id} className="flex cursor-pointer items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
            <input type="checkbox" name={name} value={item.id} className="accent-primary" />
            {item.name}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function UploadResearchForm() {
  const [categories, setCategories] = useState<Option[]>([])
  const [keywords, setKeywords] = useState<Option[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [failedUpload, setFailedUpload] = useState<FailedUpload | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    Promise.all([
      clientPublicGet<Option[]>("/categories"),
      clientPublicGet<Option[]>("/keywords"),
    ])
      .then(([cats, kws]) => {
        setCategories(cats)
        setKeywords(kws)
      })
      .catch(() => {})
  }, [])

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const file = form.get("file")
    setError(null)
    setMessage(null)
    setFailedUpload(null)

    if (!(file instanceof File) || file.type !== "application/pdf") {
      setError("Upload a PDF file.")
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      setError("PDF must be 50 MB or smaller.")
      return
    }

    startTransition(async () => {
      try {
        const authors = String(form.get("authors") ?? "")
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((name) => ({ name }))

        const categoryIds = form.getAll("categoryIds").map(String)
        const keywordIds = form.getAll("keywordIds").map(String)

        const created = await clientAction<CreatedResearch>("/research", "POST", {
          title: form.get("title"),
          abstract: form.get("abstract"),
          publishDate: form.get("publishDate") || undefined,
          authors,
          categoryIds: categoryIds.length ? categoryIds : undefined,
          keywordIds: keywordIds.length ? keywordIds : undefined,
        })

        await runUpload(created.id, file)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed")
      }
    })
  }

  async function runUpload(researchId: string, file: File, resumeKey?: string) {
    const outcome = await uploadResearchPdf(researchId, file, undefined, resumeKey)

    if (outcome.status === "ok") {
      setMessage("Research uploaded and submitted for approval.")
      setFailedUpload(null)
      return
    }

    if (outcome.status === "storage-failed") {
      setError("Upload to storage failed. Your research record was saved — retry to finish uploading the PDF.")
      setFailedUpload({ researchId, file })
      return
    }

    setError("The file reached storage but confirmation failed. Retry to finish submitting it.")
    setFailedUpload({ researchId, file, resumeKey: outcome.key })
  }

  function onRetry() {
    if (!failedUpload) return
    setError(null)
    setMessage(null)
    startTransition(async () => {
      try {
        await runUpload(failedUpload.researchId, failedUpload.file, failedUpload.resumeKey)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed")
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <label className="grid gap-2 text-sm font-medium">
        Title
        <input name="title" required className="h-10 rounded-lg border bg-background px-3 text-sm" />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Abstract
        <textarea name="abstract" required rows={6} className="rounded-lg border bg-background p-3 text-sm leading-6" />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Publish Date
        <input name="publishDate" type="date" className="h-10 rounded-lg border bg-background px-3 text-sm" />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Authors
        <textarea name="authors" required rows={4} placeholder="One author name per line" className="rounded-lg border bg-background p-3 text-sm" />
      </label>
      <MultiCheckbox legend="Categories" items={categories} name="categoryIds" />
      <MultiCheckbox legend="Keywords" items={keywords} name="keywordIds" />
      <label className="grid gap-2 text-sm font-medium">
        PDF File
        <input name="file" type="file" accept="application/pdf" required className="rounded-lg border bg-background p-3 text-sm" />
      </label>
      {message ? <p className="rounded-lg bg-secondary p-3 text-sm">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {failedUpload ? (
        <Button type="button" variant="outline" disabled={isPending} onClick={onRetry}>
          {isPending ? "Retrying…" : "Retry upload"}
        </Button>
      ) : (
        <Button type="submit" disabled={isPending}>{isPending ? "Uploading…" : "Submit Research"}</Button>
      )}
    </form>
  )
}
