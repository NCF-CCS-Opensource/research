"use client"

import Link from "next/link"
import { useEffect, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { callR2, deleteOwnedResearch, getMyResearches } from "@/lib/api"
import type { ResearchDetail } from "@/types/api"

export function OwnerResearchPanel() {
  const [papers, setPapers] = useState<ResearchDetail[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function load() {
    getMyResearches().then(setPapers).catch((reason) => setError(reason.message))
  }

  useEffect(load, [])

  function remove(id: string) {
    startTransition(async () => {
      try {
        await deleteOwnedResearch(id)
        load()
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Delete failed")
      }
    })
  }

  function download(id: string) {
    startTransition(async () => {
      try {
        const { url } = await callR2<{ url: string }>({ action: "owner-download", researchId: id })
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
        <Button asChild><Link href="/upload">Submit new</Link></Button>
      </div>
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      <div className="mt-6 grid gap-3">
        {papers.map((paper) => (
          <div key={paper.id} className="flex items-center justify-between gap-4 rounded-xl border p-4">
            <div>
              <Link href={`/research/${paper.id}`} className="font-medium">{paper.title}</Link>
              <p className="mt-1 text-xs capitalize text-muted-foreground">{paper.status} · {paper.uploadComplete ? "Completed Upload" : "Upload incomplete"}</p>
            </div>
            <div className="flex gap-2">
              {paper.status !== "approved" ? <Button variant="outline" size="sm" asChild><Link href={`/dashboard/papers/${paper.id}/edit`}>Edit</Link></Button> : null}
              {paper.uploadComplete ? <Button variant="outline" size="sm" disabled={isPending} onClick={() => download(paper.id)}>Download</Button> : null}
              <Button variant="outline" size="sm" disabled={isPending} onClick={() => remove(paper.id)}>Delete</Button>
            </div>
          </div>
        ))}
        {!papers.length && !error ? <p className="text-sm text-muted-foreground">No Research Records yet.</p> : null}
      </div>
    </section>
  )
}
