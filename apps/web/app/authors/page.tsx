import Link from "next/link"

import { Pagination } from "@/components/features/pagination"
import { PublicShell } from "@/components/layout/public-shell"
import { Button } from "@/components/ui/button"
import { discovery } from "@/lib/web-transport"
import type { Author } from "@repo/api-client"

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function value(input: string | string[] | undefined) {
  return Array.isArray(input) ? input[0] : input
}

export default async function AuthorsPage({ searchParams }: PageProps) {
  const raw = await searchParams
  const page = Number(value(raw.page) ?? 1)
  const search = value(raw.search) ?? ""
  let authors = {
    data: [] as Author[],
    meta: { total: 0, page, totalPages: 0 },
  }

  try {
    authors = await discovery.getAuthors({ page, limit: 20, search })
  } catch {}

  return (
    <PublicShell>
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-semibold tracking-tight">Authors</h1>
        <form className="mt-6 flex max-w-xl gap-2">
          <input
            name="search"
            defaultValue={search}
            placeholder="Search authors"
            className="h-10 flex-1 rounded-lg border bg-background px-3"
          />
          <Button type="submit">Search</Button>
        </form>

        <div className="mt-8 overflow-hidden rounded-3xl border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Papers</th>
                <th className="px-4 py-3 font-medium">Email</th>
              </tr>
            </thead>
            <tbody>
              {authors.data.map((author) => (
                <tr key={author.id} className="border-t">
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/authors/${author.id}`}
                      className="hover:text-primary"
                    >
                      {author.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{author.paperCount ?? 0}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {author.email ?? "-"}
                  </td>
                </tr>
              ))}
              {!authors.data.length ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    No authors found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <Pagination
          page={authors.meta.page}
          totalPages={authors.meta.totalPages}
          getHref={(target) =>
            `/authors?search=${encodeURIComponent(search)}&page=${target}`
          }
        />
      </section>
    </PublicShell>
  )
}
