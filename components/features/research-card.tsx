import Link from "next/link"
import { Download, Eye } from "lucide-react"

import type { ResearchSummary } from "@/types/api"
import { estimateReadTime } from "@/lib/read-time"

function formatDate(value?: string | null) {
  if (!value) return "n.d."
  return new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
  }).format(new Date(value))
}

function names(items?: Array<{ name: string }>) {
  if (!items?.length) return "Unknown authors"
  const first = items
    .slice(0, 2)
    .map((i) => i.name)
    .join(", ")
  return items.length > 2 ? `${first} +${items.length - 2}` : first
}

export function ResearchCard({ research }: { research: ResearchSummary }) {
  const category = research.categories?.[0]?.name ?? "Research"

  return (
    <Link
      href={`/research/${research.id}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-border/80 hover:shadow-md"
    >
      {/* left border accent */}
      <span className="absolute inset-y-0 left-0 w-[3px] bg-primary/60 transition-all duration-300 group-hover:w-1 group-hover:bg-primary" />

      <div className="flex h-full flex-col py-5 pr-5 pl-5">
        {/* category + date */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground transition-colors duration-200 group-hover:bg-primary/10 group-hover:text-primary">
            {category}
          </span>
          <span className="font-mono text-[11px] text-muted-foreground">
            {formatDate(research.publishDate ?? research.createdAt)}
          </span>
        </div>

        {/* title */}
        <h3 className="line-clamp-2 font-heading text-base leading-snug font-semibold tracking-tight transition-colors duration-200 group-hover:text-primary">
          {research.title}
        </h3>

        {/* authors */}
        <p className="mt-1.5 line-clamp-1 text-sm text-muted-foreground italic">
          {names(research.authors)}
        </p>

        {/* abstract */}
        <p className="mt-3 line-clamp-3 flex-1 text-sm leading-6 text-muted-foreground">
          {research.abstract ?? "No abstract provided."}
        </p>

        {/* stats */}
        <div className="mt-4 flex items-center gap-4 border-t pt-3 font-mono text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="size-3" /> {research.viewCount ?? 0}
          </span>
          <span className="flex items-center gap-1">
            <Download className="size-3" /> {research.downloadCount ?? 0}
          </span>
          {(() => {
            const mins = estimateReadTime(research.abstract)
            return mins ? (
              <span className="text-xs text-muted-foreground">
                {mins} min read
              </span>
            ) : null
          })()}
          {research.rank ? (
            <span className="ml-auto">score {research.rank.toFixed(2)}</span>
          ) : null}
        </div>
      </div>
    </Link>
  )
}
