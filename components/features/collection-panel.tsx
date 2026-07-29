"use client"

import Link from "next/link"
import { useEffect, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { getCollection, removeFromCollection } from "@/lib/api"

type Item = Awaited<ReturnType<typeof getCollection>>[number]

export function CollectionPanel() {
  const [items, setItems] = useState<Item[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function load() {
    getCollection()
      .then(setItems)
      .catch((reason) => setError(reason.message))
  }
  useEffect(load, [])

  return (
    <section className="rounded-3xl border bg-card p-8">
      <h1 className="text-3xl font-semibold">My Collection</h1>
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      <div className="mt-6 grid gap-3">
        {items.map((item) => (
          <div
            key={item.researchId}
            className="flex items-center justify-between rounded-xl border p-4"
          >
            <Link href={`/research/${item.researchId}`} className="font-medium">
              {item.research.title}
            </Link>
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await removeFromCollection(item.researchId)
                  load()
                })
              }
            >
              Remove
            </Button>
          </div>
        ))}
        {!items.length && !error ? (
          <p className="text-sm text-muted-foreground">
            No saved Research Records.
          </p>
        ) : null}
      </div>
    </section>
  )
}
