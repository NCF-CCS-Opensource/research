import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Eye, FileDown, Quote } from "lucide-react"
import { notFound } from "next/navigation"

import { Button } from "@/components/ui/button"
import { PublicShell } from "@/components/layout/public-shell"
import { getResearch, getCategory } from "@/lib/api"
import { estimateReadTime } from "@/lib/read-time"
import { ResearchActions } from "@/components/features/research-actions"
import { CitationGenerator } from "@/components/features/citation-generator"
import { QrCode } from "@/components/features/qr-code"
import { ResearchCard } from "@/components/features/research-card"

type PageProps = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  try {
    const { id } = await params
    const research = await getResearch(id)
    return {
      title: research.title,
      description: research.abstract?.slice(0, 160) ?? undefined,
    }
  } catch {
    return { title: "Research" }
  }
}

function formatDate(value?: string | null) {
  if (!value) return "Undated"
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
    new Date(value)
  )
}

async function loadRelated(categoryId: string, excludeId: string) {
  try {
    const result = await getCategory(categoryId, 1)
    return (result.data.researches ?? [])
      .filter((r) => r.id !== excludeId)
      .slice(0, 4)
  } catch {
    return []
  }
}

export default async function ResearchDetailPage({ params }: PageProps) {
  const { id } = await params
  let research

  try {
    research = await getResearch(id)
  } catch {
    notFound()
  }

  const primaryCategoryId = research.categories?.[0]?.id ?? null
  const related = primaryCategoryId
    ? await loadRelated(primaryCategoryId, research.id)
    : []

  const authorList = research.authors ?? []
  const authorLine =
    authorList.map((a) => a.name).join(", ") || "Unknown authors"
  const citationYear = research.publishDate?.slice(0, 4) ?? "n.d."

  return (
    <PublicShell>
      <article className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <Button variant="ghost" asChild>
          <Link href="/search">
            <ArrowLeft className="size-4" /> Back to results
          </Link>
        </Button>

        <div className="mt-8 rounded-3xl border bg-card p-6 sm:p-8">
          <div className="flex flex-wrap gap-2">
            {research.categories?.map((category) => (
              <Link
                key={category.id}
                href={`/categories/${category.id}`}
                className="rounded-full bg-secondary px-3 py-1 text-xs font-medium"
              >
                {category.name}
              </Link>
            ))}
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">
            {research.title}
          </h1>
          <p className="mt-4 text-muted-foreground">
            Authors:{" "}
            {authorList.length > 0
              ? authorList.map((a, i) => (
                  <span key={a.id}>
                    {i > 0 && ", "}
                    <Link
                      href={`/authors/${a.id}`}
                      className="hover:text-foreground hover:underline"
                    >
                      {a.name}
                    </Link>
                  </span>
                ))
              : "Unknown authors"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Published: {formatDate(research.publishDate)}
          </p>

          {research.rejectionReason && (
            <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              <span className="font-medium">Rejected:</span>{" "}
              {research.rejectionReason}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            {research.keywords?.map((keyword) => (
              <span
                key={keyword.id}
                className="rounded-full border px-3 py-1 text-xs text-muted-foreground"
              >
                {keyword.name}
              </span>
            ))}
          </div>

          <div className="mt-8 grid gap-3 rounded-2xl bg-muted/50 p-4 text-sm sm:grid-cols-3">
            <div className="flex items-center gap-2">
              <Eye className="size-4" /> Views: {research.viewCount ?? 0}
            </div>
            <div className="flex items-center gap-2">
              <FileDown className="size-4" /> Downloads:{" "}
              {research.downloadCount ?? 0}
            </div>
            <div className="flex items-center gap-2">
              <Quote className="size-4" /> Citations:{" "}
              {research.citationCount ?? 0}
            </div>
            {(() => {
              const mins = estimateReadTime(research.abstract)
              return mins ? (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  ~{mins} min read
                </span>
              ) : null
            })()}
          </div>

          <ResearchActions
            researchId={research.id}
            citation={`${authorLine}. (${citationYear}). ${research.title}.`}
          />
        </div>

        <section className="mt-8 rounded-3xl border bg-card p-6 sm:p-8">
          <h2 className="text-xl font-semibold">Abstract</h2>
          <p className="mt-4 leading-8 text-muted-foreground">
            {research.abstract ?? "No abstract provided."}
          </p>
        </section>

        <section className="mt-8 rounded-3xl border bg-card p-6 sm:p-8">
          <h2 className="text-xl font-semibold">Citation Generator</h2>
          <div className="mt-4">
            <CitationGenerator
              authors={authorLine}
              year={citationYear}
              title={research.title}
            />
          </div>
        </section>

        <section className="mt-8 rounded-3xl border bg-card p-6 sm:p-8">
          <h2 className="font-heading text-xl font-semibold tracking-tight">
            Share
          </h2>
          <div className="mt-4">
            <QrCode researchId={research.id} />
          </div>
        </section>

        {related.length > 0 && (
          <section className="mt-8 rounded-3xl border bg-card p-6 sm:p-8">
            <h2 className="font-heading text-xl font-semibold tracking-tight">
              More from {research.categories![0].name}
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {related.map((item) => (
                <ResearchCard key={item.id} research={item} />
              ))}
            </div>
          </section>
        )}
      </article>
    </PublicShell>
  )
}
