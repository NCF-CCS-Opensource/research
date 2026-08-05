import { ArrowRight, BookMarked, Library, Quote, Search } from "lucide-react"
import Link from "next/link"

import { ResearchCard } from "@/components/features/research-card"
import { SearchForm } from "@/components/forms/search-form"
import { PublicShell } from "@/components/layout/public-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { discovery } from "@/lib/web-transport"
import type { ResearchSummary } from "@/types/api"

const features = [
  {
    icon: Search,
    label: "Full-text search",
    sub: "By title, author, keyword, or category",
  },
  {
    icon: Library,
    label: "Save to collections",
    sub: "Bookmark papers and build your reading list",
  },
  {
    icon: Quote,
    label: "Export citations",
    sub: "APA, MLA, Chicago, and IEEE formats",
  },
]

async function loadRecentResearch() {
  try {
    return await discovery.getRecentResearch(6)
  } catch {
    return {
      data: [] as ResearchSummary[],
      meta: { total: 0, page: 1, totalPages: 0 },
    }
  }
}

export default async function Page() {
  const recent = await loadRecentResearch()

  return (
    <PublicShell>
      <section className="archive-grid relative overflow-hidden border-b border-foreground/15">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end lg:gap-20 lg:px-8 lg:py-24">
          <div>
            <Badge
              variant="outline"
              className="animate-fade-up rounded-sm border-foreground/25 bg-background/80 font-mono text-[10px] tracking-[0.16em] uppercase"
            >
              NCF · College of Computer Studies
            </Badge>
            <h1
              className="animate-fade-up mt-8 max-w-4xl font-heading text-5xl leading-[0.96] font-semibold tracking-[-0.04em] sm:text-7xl lg:text-[6.3rem]"
              style={{ animationDelay: "70ms" }}
            >
              Research worth{" "}
              <span className="relative italic">
                finding.
                <span className="absolute right-0 -bottom-2 left-0 h-2 bg-accent/80" />
              </span>
            </h1>
            <p
              className="animate-fade-up mt-8 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg"
              style={{ animationDelay: "140ms" }}
            >
              Discover approved theses and papers from NCF&apos;s computing
              community, then save, cite, or request access from the owner.
            </p>
            <div
              className="animate-fade-up mt-9 max-w-3xl"
              style={{ animationDelay: "210ms" }}
            >
              <SearchForm />
            </div>
            <Button
              variant="link"
              className="animate-fade-up mt-5 h-auto px-0 font-mono text-xs tracking-wide uppercase"
              style={{ animationDelay: "280ms" }}
              asChild
            >
              <Link href="/search">
                Browse the full index <ArrowRight />
              </Link>
            </Button>
          </div>

          <Card
            className="animate-fade-up relative gap-0 rounded-none py-0 shadow-[8px_8px_0_var(--primary)]"
            style={{ animationDelay: "180ms" }}
          >
            <div className="h-2 bg-accent" />
            <CardHeader className="border-b px-5 py-4">
              <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                Digital catalogue
              </p>
              <CardTitle className="mt-8 font-heading text-8xl leading-none font-medium text-primary">
                01
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 px-5 py-5">
              <div>
                <p className="font-mono text-2xl font-medium">
                  {recent.meta.total}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  approved records
                </p>
              </div>
              <div className="border-l pl-4">
                <p className="font-mono text-2xl font-medium">04</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  citation styles
                </p>
              </div>
            </CardContent>
            <CardFooter className="justify-between border-t bg-primary px-5 py-4 text-primary-foreground">
              <span className="font-mono text-[10px] tracking-wider uppercase">
                Open access metadata
              </span>
              <BookMarked className="size-4" />
            </CardFooter>
          </Card>
        </div>
      </section>

      <section className="border-b border-foreground/15 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid divide-y divide-primary-foreground/15 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {features.map(({ icon: Icon, label, sub }) => (
              <div
                key={label}
                className="flex items-start gap-4 py-6 sm:px-7 first:sm:pl-0 last:sm:pr-0"
              >
                <span className="flex size-9 shrink-0 items-center justify-center border border-primary-foreground/20 text-accent">
                  <Icon className="size-4" />
                </span>
                <div>
                  <p className="font-heading text-base font-semibold">
                    {label}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-primary-foreground/60">
                    {sub}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div
          className="animate-fade-up mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
          style={{ animationDelay: "200ms" }}
        >
          <div>
            <p className="font-mono text-[10px] font-medium tracking-[0.18em] text-primary uppercase">
              Filed most recently
            </p>
            <h2 className="mt-2 font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
              New in the index
            </h2>
          </div>
          <Button variant="outline" asChild>
            <Link href="/search">
              View all <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        {recent.data.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {recent.data.map((research, i) => (
              <div
                key={research.id}
                className="animate-fade-up"
                style={{ animationDelay: `${300 + i * 60}ms` }}
              >
                <ResearchCard research={research} />
              </div>
            ))}
          </div>
        ) : (
          <Card
            className="animate-fade-in items-center border-dashed py-12 text-center"
            style={{ animationDelay: "300ms" }}
          >
            <BookMarked className="mx-auto mb-3 size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No approved papers yet. Submit the first one.
            </p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/upload">Submit a paper</Link>
            </Button>
          </Card>
        )}
      </section>
    </PublicShell>
  )
}
