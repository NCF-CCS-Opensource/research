"use client"

import Link from "next/link"
import { useEffect, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { callR2, researchLifecycle } from "@/lib/web-transport"
import { replaceResearchPdf } from "@/lib/research-ingestion"
import type { ResearchDetail } from "@repo/api-client"

export function OwnerResearchPanel() {
  const [papers, setPapers] = useState<ResearchDetail[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function load() {
    researchLifecycle.getOwnerRecords()
      .then(setPapers)
      .catch((reason) => setError(reason.message))
  }

  useEffect(load, [])

  function remove(id: string) {
    startTransition(async () => {
      try {
        await researchLifecycle.deleteRecord(id)
        load()
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Delete failed")
      }
    })
  }

  function download(id: string) {
    startTransition(async () => {
      try {
        const { url } = await callR2<{ url: string }>({
          action: "owner-download",
          researchId: id,
        })
        window.open(url, "_blank", "noopener,noreferrer")
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Download failed")
      }
    })
  }

  return (
    <section className="rounded-3xl border bg-card p-8">
      <div className="flex justify-between gap-4">
        <h1 className="text-3xl font-semibold">My Research Records</h1>
        <Button asChild>
          <Link href="/upload">Submit new</Link>
        </Button>
      </div>
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      <div className="mt-6 grid gap-3">
        {papers.map((paper) => (
          <div
            key={paper.id}
            className="flex items-center justify-between gap-4 rounded-xl border p-4"
          >
            <div>
              <Link href={`/research/${paper.id}`} className="font-medium">
                {paper.title}
              </Link>
              <p className="mt-1 text-xs text-muted-foreground capitalize">
                {paper.status} ·{" "}
                {paper.uploadComplete
                  ? "Completed Upload"
                  : "Upload incomplete"}
              </p>
            </div>
            <div className="flex gap-2">
              {paper.status !== "approved" ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/papers/${paper.id}/edit`}>Edit</Link>
                </Button>
              ) : null}
              {paper.status === "rejected" ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      await researchLifecycle.resubmitRecord(paper.id)
                      load()
                    })
                  }
                >
                  Resubmit
                </Button>
              ) : null}
              {paper.uploadComplete ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => download(paper.id)}
                >
                  Download
                </Button>
              ) : null}
              {paper.uploadComplete ? (
                <label className="inline-flex h-7 cursor-pointer items-center rounded-lg border px-2.5 text-[0.8rem] font-medium hover:bg-muted">
                  Replace PDF
                  <input
                    className="sr-only"
                    type="file"
                    accept="application/pdf"
                    disabled={isPending}
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (!file) return
                      startTransition(async () => {
                        const outcome = await replaceResearchPdf(paper.id, file)
                        if (outcome.status !== "completed") {
                          setError(
                            "message" in outcome
                              ? outcome.message
                              : "PDF replacement failed"
                          )
                        }
                        load()
                      })
                    }}
                  />
                </label>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => remove(paper.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
        {!papers.length && !error ? (
          <p className="text-sm text-muted-foreground">
            No Research Records yet.
          </p>
        ) : null}
      </div>
    </section>
  )
}
