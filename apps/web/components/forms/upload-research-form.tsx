"use client"

import { useState, useTransition, useEffect } from "react"

import { Button } from "@/components/ui/button"
import { getCategories, getKeywords } from "@/lib/api"
import {
  submitResearchRecord,
  type IngestOutcome,
} from "@/lib/research-ingestion"

type Option = { id: string; name: string }

export function MultiCheckbox({
  legend,
  items,
  name,
  selectedIds = [],
}: {
  legend: string
  items: Option[]
  name: string
  selectedIds?: string[]
}) {
  if (!items.length) return null
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <label
            key={item.id}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
          >
            <input
              type="checkbox"
              name={name}
              value={item.id}
              defaultChecked={selectedIds.includes(item.id)}
              className="accent-primary"
            />
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
  const [retryClosure, setRetryClosure] = useState<
    (() => Promise<IngestOutcome>) | null
  >(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    Promise.all([getCategories(), getKeywords()])
      .then(([cats, kws]) => {
        setCategories(cats)
        setKeywords(kws)
      })
      .catch(() => {})
  }, [])

  function handleOutcome(outcome: IngestOutcome) {
    if (outcome.status === "completed") {
      setMessage("Research uploaded and submitted for approval.")
      setError(null)
      setRetryClosure(null)
      return
    }

    if (outcome.status === "invalid-input") {
      setError(outcome.message)
      setMessage(null)
      setRetryClosure(null)
      return
    }

    if (outcome.status === "storage-failed") {
      setError(
        "Upload to storage failed. Your research record was saved — retry to finish uploading the PDF."
      )
      setMessage(null)
      setRetryClosure(() => outcome.retry)
      return
    }

    if (outcome.status === "confirm-failed") {
      setError(
        "The file reached storage but confirmation failed. Retry to finish submitting it."
      )
      setMessage(null)
      setRetryClosure(() => outcome.retry)
      return
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const file = form.get("file")
    setError(null)
    setMessage(null)
    setRetryClosure(null)

    if (!(file instanceof File)) {
      setError("Upload a PDF file.")
      return
    }

    startTransition(async () => {
      const authors = String(form.get("authors") ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((name) => ({ name }))

      const categoryIds = form.getAll("categoryIds").map(String)
      const keywordIds = form.getAll("keywordIds").map(String)

      const outcome = await submitResearchRecord({
        title: String(form.get("title")),
        abstract: String(form.get("abstract")),
        publishDate: String(form.get("publishDate") || ""),
        authors,
        categoryIds,
        keywordIds,
        file,
      })

      handleOutcome(outcome)
    })
  }

  function onRetry() {
    if (!retryClosure) return
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const outcome = await retryClosure()
      handleOutcome(outcome)
    })
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <label className="grid gap-2 text-sm font-medium">
        Title
        <input
          name="title"
          required
          className="h-10 rounded-lg border bg-background px-3 text-sm"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Abstract
        <textarea
          name="abstract"
          required
          rows={6}
          className="rounded-lg border bg-background p-3 text-sm leading-6"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Publish Date
        <input
          name="publishDate"
          type="date"
          className="h-10 rounded-lg border bg-background px-3 text-sm"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Authors
        <textarea
          name="authors"
          required
          rows={4}
          placeholder="One author name per line"
          className="rounded-lg border bg-background p-3 text-sm"
        />
      </label>
      <MultiCheckbox
        legend="Categories"
        items={categories}
        name="categoryIds"
      />
      <MultiCheckbox legend="Keywords" items={keywords} name="keywordIds" />
      <label className="grid gap-2 text-sm font-medium">
        PDF File
        <input
          name="file"
          type="file"
          accept="application/pdf"
          required
          className="rounded-lg border bg-background p-3 text-sm"
        />
      </label>
      {message ? (
        <p className="rounded-lg bg-secondary p-3 text-sm">{message}</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {retryClosure ? (
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={onRetry}
        >
          {isPending ? "Retrying…" : "Retry upload"}
        </Button>
      ) : (
        <Button type="submit" disabled={isPending}>
          {isPending ? "Uploading…" : "Submit Research"}
        </Button>
      )}
    </form>
  )
}
