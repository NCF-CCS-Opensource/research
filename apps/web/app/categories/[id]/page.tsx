import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { notFound } from "next/navigation"

import { Pagination } from "@/components/features/pagination"
import { ResearchCard } from "@/components/features/research-card"
import { PublicShell } from "@/components/layout/public-shell"
import { Button } from "@/components/ui/button"
import { publicQueries } from "@/lib/web-transport"

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function CategoryDetailPage({
  params,
  searchParams,
}: PageProps) {
  const [{ id }, raw] = await Promise.all([params, searchParams])
  const page = Number(Array.isArray(raw.page) ? raw.page[0] : (raw.page ?? 1))
  let category

  try {
    category = await publicQueries.getCategory(id, page)
  } catch {
    notFound()
  }

  return (
    <PublicShell>
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <Button variant="ghost" asChild>
          <Link href="/categories">
            <ArrowLeft className="size-4" /> Back to Categories
          </Link>
        </Button>
        <div className="mt-8 rounded-3xl border bg-card p-8">
          <h1 className="text-4xl font-semibold tracking-tight">
            {category.data.name}
          </h1>
          <p className="mt-3 text-muted-foreground">
            {category.meta.total} papers in this category
          </p>
        </div>
        <div className="mt-8 grid gap-4">
          {category.data.researches.map((paper) => (
            <ResearchCard key={paper.id} research={paper} />
          ))}
          {!category.data.researches.length ? (
            <div className="rounded-3xl border border-dashed p-10 text-center text-muted-foreground">
              No papers in this category yet.
            </div>
          ) : null}
        </div>
        <Pagination
          page={category.meta.page}
          totalPages={category.meta.totalPages}
          getHref={(target) => `/categories/${id}?page=${target}`}
        />
      </section>
    </PublicShell>
  )
}
