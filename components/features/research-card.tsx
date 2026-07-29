import Link from "next/link"
import { ArrowUpRight, Download, Eye } from "lucide-react"

import type { ResearchSummary } from "@/types/api"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  const mins = estimateReadTime(research.abstract)

  return (
    <Link
      href={`/research/${research.id}`}
      className="group block h-full focus-visible:outline-none"
    >
      <Card className="relative h-full gap-0 overflow-visible py-0 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[5px_5px_0_var(--accent)] group-focus-visible:ring-3 group-focus-visible:ring-ring">
        <span className="absolute top-0 -left-px h-12 w-1 bg-accent" />
        <CardHeader className="border-b px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <Badge
              variant="secondary"
              className="rounded-sm font-mono text-[10px] tracking-wide uppercase"
            >
              {category}
            </Badge>
            <span className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
              {formatDate(research.publishDate ?? research.createdAt)}
            </span>
          </div>
          <CardTitle className="mt-4 line-clamp-2 font-heading text-xl font-semibold tracking-tight transition-colors group-hover:text-primary">
            {research.title}
          </CardTitle>
          <p className="mt-1 line-clamp-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {names(research.authors)}
          </p>
        </CardHeader>

        <CardContent className="flex-1 px-5 py-5">
          <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
            {research.abstract ?? "No abstract provided."}
          </p>
        </CardContent>

        <CardFooter className="gap-4 border-t bg-transparent px-5 py-3 font-mono text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="size-3" /> {research.viewCount ?? 0}
          </span>
          <span className="flex items-center gap-1">
            <Download className="size-3" /> {research.downloadCount ?? 0}
          </span>
          {mins ? <span>{mins} min read</span> : null}
          {research.rank ? (
            <span className="ml-auto">score {research.rank.toFixed(2)}</span>
          ) : (
            <ArrowUpRight className="ml-auto size-3.5 text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          )}
        </CardFooter>
      </Card>
    </Link>
  )
}
