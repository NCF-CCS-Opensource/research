"use client"

import { useEffect, useState } from "react"

import { getEngagementOverview } from "@/lib/api"

type Overview = Awaited<ReturnType<typeof getEngagementOverview>>

export function EngagementPanel({ admin = false }: { admin?: boolean }) {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getEngagementOverview().then(setOverview).catch((reason) => setError(reason.message))
  }, [])

  const stats = [
    ["Research Records", overview?.totalResearches],
    ["Views", overview?.totalViews],
    ["Downloads", overview?.totalDownloads],
    ["Citations", overview?.totalCitations],
    ...(admin ? [["Users", overview?.totalUsers] as const] : []),
  ]

  return (
    <section className="rounded-3xl border bg-card p-8">
      <h1 className="text-3xl font-semibold">{admin ? "Admin Dashboard" : "My Engagement"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Cumulative counts for {admin ? "the Research Hub" : "your Research Records"}.</p>
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-background p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-semibold">{value ?? "—"}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
