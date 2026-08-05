import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, BookOpen, Mail, User } from "lucide-react"
import { notFound } from "next/navigation"

import { ResearchCard } from "@/components/features/research-card"
import { Pagination } from "@/components/features/pagination"
import { PublicShell } from "@/components/layout/public-shell"
import { Button } from "@/components/ui/button"
import { discovery } from "@/lib/web-transport"

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  try {
    const { id } = await params
    const author = await discovery.getAuthor(id)
    return { title: `${author.name} — Authors` }
  } catch {
    return { title: "Author" }
  }
}

export default async function AuthorProfilePage({
  params,
  searchParams,
}: PageProps) {
  const [{ id }, raw] = await Promise.all([params, searchParams])
  const page = Number(Array.isArray(raw.page) ? raw.page[0] : (raw.page ?? 1))
  let author
  let papers

  try {
    ;[author, papers] = await Promise.all([
      discovery.getAuthor(id),
      discovery.getAuthorPapers(id, page),
    ])
  } catch {
    notFound()
  }

  return (
    <PublicShell>
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <Button variant="ghost" asChild>
          <Link href="/authors">
            <ArrowLeft className="size-4" /> Back to Authors
          </Link>
        </Button>

        {/* Profile card */}
        <div className="mt-8 rounded-3xl border bg-card p-8">
          <div className="flex items-start gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <User className="size-8" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-semibold tracking-tight">
                {author.name}
              </h1>
              {author.email && (
                <a
                  href={`mailto:${author.email}`}
                  className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  <Mail className="size-3.5" /> {author.email}
                </a>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 rounded-2xl bg-muted/40 p-4 sm:grid-cols-3">
            <div className="flex items-center gap-2">
              <BookOpen className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xl font-semibold">{papers.meta.total}</p>
                <p className="text-xs text-muted-foreground">
                  Published papers
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Papers */}
        <div className="mt-10">
          <h2 className="text-2xl font-semibold tracking-tight">
            Research Papers
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            All approved papers authored or co-authored by {author.name}
          </p>
          {papers.data.length > 0 ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {papers.data.map((paper) => (
                <ResearchCard key={paper.id} research={paper} />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
              No published papers yet.
            </div>
          )}
        </div>

        <Pagination
          page={papers.meta.page}
          totalPages={papers.meta.totalPages}
          getHref={(target) => `/authors/${id}?page=${target}`}
        />
      </section>
    </PublicShell>
  )
}
