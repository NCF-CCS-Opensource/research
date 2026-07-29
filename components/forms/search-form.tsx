"use client"

import Link from "next/link"
import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getSuggestions } from "@/lib/api"
import type { SearchSuggestions } from "@/types/api"

export function SearchForm({
  compact = false,
  defaultValue = "",
}: {
  compact?: boolean
  defaultValue?: string
}) {
  const router = useRouter()
  const [query, setQuery] = useState(defaultValue)
  const [suggestions, setSuggestions] = useState<SearchSuggestions | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (query.trim().length < 2) {
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      try {
        const result = await getSuggestions(query)
        if (!controller.signal.aborted) setSuggestions(result)
      } catch {
        if (!controller.signal.aborted) setSuggestions(null)
      }
    }, 250)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [query])

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const target = query.trim()
    startTransition(() => {
      router.push(
        target ? `/search?q=${encodeURIComponent(target)}` : "/search"
      )
    })
  }

  return (
    <form onSubmit={onSubmit} className="relative w-full">
      <div className="group flex items-center gap-2 border border-foreground/20 bg-card p-2 shadow-[6px_6px_0_var(--accent)] transition-shadow focus-within:shadow-[3px_3px_0_var(--accent)]">
        <label
          className="sr-only"
          htmlFor={compact ? "compact-search" : "hero-search"}
        >
          Search research
        </label>
        <div className="flex min-w-0 flex-1 items-center gap-2 px-2 sm:px-3">
          <Search className="size-4 shrink-0 text-primary" />
          <Input
            id={compact ? "compact-search" : "hero-search"}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-11 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0 dark:bg-transparent"
            placeholder="Title, author, keyword, or field"
            autoComplete="off"
          />
        </div>
        <Button
          type="submit"
          size="lg"
          className="h-11 px-4 sm:px-5"
          disabled={isPending}
        >
          <span className="hidden sm:inline">
            {isPending ? "Searching" : "Search index"}
          </span>
          <ArrowRight />
        </Button>
      </div>

      {query.trim().length >= 2 &&
      suggestions &&
      (suggestions.researches.length || suggestions.authors.length) ? (
        <div className="mt-3 overflow-hidden border bg-popover p-2 text-left shadow-xl">
          {suggestions.researches.slice(0, 4).map((item) => (
            <Link
              key={item.id}
              href={`/research/${item.id}`}
              className="block rounded-xl px-3 py-2 text-sm hover:bg-muted"
            >
              <span className="font-medium">{item.title}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                Research title
              </span>
            </Link>
          ))}
          {suggestions.authors.slice(0, 3).map((item) => (
            <Link
              key={item.id}
              href={`/authors/${item.id}`}
              className="block rounded-xl px-3 py-2 text-sm hover:bg-muted"
            >
              {item.name}
              <span className="ml-2 text-xs text-muted-foreground">Author</span>
            </Link>
          ))}
          <Link
            href={`/search?q=${encodeURIComponent(query)}`}
            className="block rounded-xl px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            See all results
          </Link>
        </div>
      ) : null}
    </form>
  )
}
