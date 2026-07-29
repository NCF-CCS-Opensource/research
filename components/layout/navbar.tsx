import Link from "next/link"
import { BookOpen, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { createServerSupabase } from "@/lib/supabase-server"

const navItems = [
  { href: "/search", label: "Search" },
  { href: "/authors", label: "Authors" },
  { href: "/categories", label: "Categories" },
]

export async function Navbar() {
  const supabase = await createServerSupabase()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  const profile = userId
    ? await supabase.from("profiles").select("role").eq("id", userId).maybeSingle()
    : null
  const role = profile?.data?.role ?? null

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 transition-opacity duration-200 hover:opacity-80">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BookOpen className="size-4" />
          </span>
          <span className="font-heading font-semibold tracking-tight">CCS Research Hub</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Button key={item.href} variant="ghost" asChild>
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="icon" className="md:hidden" asChild>
            <Link href="/search" aria-label="Search">
              <Search className="size-4" />
            </Link>
          </Button>
          {role ? (
            <>
              <Button variant="ghost" asChild>
                <Link href={role === "admin" ? "/admin" : "/dashboard"}>Dashboard</Link>
              </Button>
              <form action="/api/auth/logout" method="POST">
                <Button variant="outline" type="submit">Sign Out</Button>
              </form>
            </>
          ) : (
            <Button variant="outline" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
