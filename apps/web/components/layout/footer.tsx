import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-foreground/15 bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_auto] md:items-end lg:px-8">
        <div>
          <p className="font-heading text-2xl">Knowledge, kept in motion.</p>
          <p className="mt-2 max-w-md text-sm leading-6 text-primary-foreground/65">
            The digital research index of Naga College Foundation&apos;s College
            of Computer Studies.
          </p>
        </div>
        <nav className="flex gap-5 font-mono text-xs tracking-wide uppercase">
          <Link href="/search" className="hover:text-accent">
            Search
          </Link>
          <Link href="/authors" className="hover:text-accent">
            Authors
          </Link>
          <Link href="/categories" className="hover:text-accent">
            Categories
          </Link>
        </nav>
        <p className="border-t border-primary-foreground/15 pt-5 font-mono text-[10px] tracking-wider text-primary-foreground/50 uppercase md:col-span-2">
          © 2026 CCS Research Hub · NCF
        </p>
      </div>
    </footer>
  )
}
