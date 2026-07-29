import { ArrowRight, BookMarked, Library, Quote, Search } from "lucide-react"
import Link from "next/link"

import { ResearchCard } from "@/components/features/research-card"
import { SearchForm } from "@/components/forms/search-form"
import { PublicShell } from "@/components/layout/public-shell"
import { Button } from "@/components/ui/button"
import { getRecentResearch } from "@/lib/api"
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
    return await getRecentResearch(6)
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
      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-primary to-primary/85 text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <p
            className="animate-fade-up mb-5 text-xs font-semibold tracking-widest text-primary-foreground/50 uppercase"
            style={{ animationDelay: "0ms" }}
          >
            Naga College Foundation · College of Computer Studies
          </p>
          <h1
            className="animate-fade-up max-w-3xl font-heading text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl"
            style={{ animationDelay: "80ms" }}
          >
            CCS Research,
            <br className="hidden sm:block" /> centralized.
          </h1>
          <p
            className="animate-fade-up mt-6 max-w-xl text-base leading-7 text-primary-foreground/70 sm:text-lg"
            style={{ animationDelay: "160ms" }}
          >
            Discover and cite approved theses and papers from NCF&apos;s College
            of Computer Studies. Research PDFs are available by Owner-approved
            request.
          </p>
          <div
            className="animate-fade-up mt-10 max-w-2xl"
            style={{ animationDelay: "240ms" }}
          >
            <SearchForm />
          </div>
          <div
            className="animate-fade-up mt-6"
            style={{ animationDelay: "320ms" }}
          >
            <Button
              variant="ghost"
              className="px-0 text-primary-foreground/70 transition-colors duration-200 hover:bg-primary-foreground/10 hover:text-primary-foreground"
              asChild
            >
              <Link href="/search">
                Browse all papers <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Feature strip ── */}
      <section className="border-b bg-secondary">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {features.map(({ icon: Icon, label, sub }, i) => (
              <div
                key={label}
                className="animate-fade-up flex items-center gap-4 py-5 sm:px-8 first:sm:pl-0 last:sm:pr-0"
                style={{ animationDelay: `${400 + i * 60}ms` }}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors duration-200 group-hover:bg-primary/20">
                  <Icon className="size-4 text-primary" />
                </span>
                <div>
                  <p className="font-heading text-sm font-semibold">{label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Recent papers ── */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div
          className="animate-fade-up mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
          style={{ animationDelay: "200ms" }}
        >
          <div>
            <p className="font-mono text-xs font-medium tracking-widest text-muted-foreground uppercase">
              Latest from the archive
            </p>
            <h2 className="mt-2 font-heading text-3xl font-bold tracking-tight">
              Recently approved papers
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
          <div
            className="animate-fade-in rounded-xl border border-dashed p-12 text-center"
            style={{ animationDelay: "300ms" }}
          >
            <BookMarked className="mx-auto mb-3 size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No approved papers yet. Submit the first one.
            </p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/upload">Submit a paper</Link>
            </Button>
          </div>
        )}
      </section>
    </PublicShell>
  )
}
