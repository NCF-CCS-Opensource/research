"use client"

import Link from "next/link"
import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Mic, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
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
      <div className="flex gap-2 rounded-2xl border bg-background p-2 shadow-lg shadow-black/5">
        <label
          className="sr-only"
          htmlFor={compact ? "compact-search" : "hero-search"}
        >
          Search research
        </label>
        <div className="flex flex-1 items-center gap-2 px-3">
          <Search className="size-4 text-muted-foreground" />
          <input
            id={compact ? "compact-search" : "hero-search"}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Search by title, author, keyword..."
          />
        </div>
        {!compact ? (
          <Button
            type="button"
            variant="outline"
            size="lg"
            aria-label="Voice search"
          >
            <Mic className="size-4" />
          </Button>
        ) : null}
        <Button type="submit" size="lg" disabled={isPending}>
          Search
        </Button>
      </div>

      {query.trim().length >= 2 &&
      suggestions &&
      (suggestions.researches.length || suggestions.authors.length) ? (
        <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border bg-popover p-2 text-left shadow-xl">
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
