import Link from "next/link"

import { Button } from "@/components/ui/button"

export function Pagination({
  page,
  totalPages,
  getHref,
}: {
  page: number
  totalPages: number
  getHref: (page: number) => string
}) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-2 py-8">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        asChild={page > 1}
      >
        {page > 1 ? (
          <Link href={getHref(page - 1)}>Previous</Link>
        ) : (
          <span>Previous</span>
        )}
      </Button>
      <span className="px-3 text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        asChild={page < totalPages}
      >
        {page < totalPages ? (
          <Link href={getHref(page + 1)}>Next</Link>
        ) : (
          <span>Next</span>
        )}
      </Button>
    </div>
  )
}
