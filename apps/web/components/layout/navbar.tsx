import Link from "next/link"
import { BookOpenText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { MobileNav } from "@/components/layout/mobile-nav"
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
    ? await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle()
    : null
  const role = profile?.data?.role ?? null

  return (
    <header className="sticky top-0 z-40 border-b border-foreground/15 bg-background/92 backdrop-blur-xl">
      <div className="h-1 bg-accent" />
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <span className="flex size-9 items-center justify-center bg-primary text-primary-foreground transition-transform group-hover:-rotate-3">
            <BookOpenText className="size-4" />
          </span>
          <span className="grid leading-none">
            <span className="font-heading text-lg font-semibold tracking-tight">
              CCS Research
            </span>
            <span className="mt-1 font-mono text-[9px] tracking-[0.18em] text-muted-foreground uppercase">
              NCF digital index
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 rounded-full border bg-card/70 p-1 md:flex">
          {navItems.map((item, index) => (
            <Button key={item.href} variant="ghost" asChild>
              <Link href={item.href}>
                <span className="font-mono text-[9px] text-muted-foreground">
                  0{index + 1}
                </span>
                {item.label}
              </Link>
            </Button>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <MobileNav items={navItems} />
          {role ? (
            <>
              <Button variant="ghost" className="hidden sm:inline-flex" asChild>
                <Link href={role === "admin" ? "/admin" : "/dashboard"}>
                  Dashboard
                </Link>
              </Button>
              <form action="/api/auth/logout" method="POST">
                <Button
                  variant="outline"
                  type="submit"
                  className="hidden sm:inline-flex"
                >
                  Sign Out
                </Button>
              </form>
            </>
          ) : (
            <Button asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
