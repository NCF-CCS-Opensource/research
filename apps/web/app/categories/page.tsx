import Link from "next/link"
import { FolderOpen } from "lucide-react"

import { PublicShell } from "@/components/layout/public-shell"
import { discovery } from "@/lib/web-transport"
import type { Category } from "@repo/api-client"

export default async function CategoriesPage() {
  let categories: Category[] = []
  try {
    categories = await discovery.getCategories()
  } catch {}

  return (
    <PublicShell>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-semibold tracking-tight">Categories</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Browse research by discipline and topic area.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/categories/${category.id}`}
              className="rounded-3xl border bg-card p-6 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
            >
              <FolderOpen className="mb-8 size-7 text-primary" />
              <h2 className="text-xl font-semibold">{category.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {category.researchCount ?? 0} approved papers
              </p>
            </Link>
          ))}
          {!categories.length ? (
            <div className="col-span-full rounded-3xl border border-dashed p-10 text-center text-muted-foreground">
              No categories found.
            </div>
          ) : null}
        </div>
      </section>
    </PublicShell>
  )
}
