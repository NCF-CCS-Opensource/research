export default function Loading() {
  return (
    <div className="min-h-svh bg-muted/20">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[240px_1fr] lg:px-8">
        <div className="h-64 animate-pulse rounded-3xl bg-muted" />
        <div className="space-y-4">
          <div className="h-10 w-48 animate-pulse rounded-lg bg-muted" />
          <div className="h-48 animate-pulse rounded-3xl bg-muted" />
        </div>
      </div>
    </div>
  )
}
