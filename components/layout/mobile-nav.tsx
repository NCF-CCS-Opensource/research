"use client"

import Link from "next/link"
import { BookOpenText, Menu } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

export function MobileNav({
  items,
}: {
  items: ReadonlyArray<{ href: string; label: string }>
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu />
          <span className="sr-only">Open navigation</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(22rem,90vw)] p-0">
        <SheetHeader className="border-b p-6 text-left">
          <div className="flex size-10 items-center justify-center bg-primary text-primary-foreground">
            <BookOpenText className="size-5" />
          </div>
          <SheetTitle className="font-heading text-2xl">
            Research index
          </SheetTitle>
          <SheetDescription>
            Browse the CCS archive by paper, author, or field.
          </SheetDescription>
        </SheetHeader>
        <nav className="grid p-3">
          {items.map((item, index) => (
            <SheetClose key={item.href} asChild>
              <Link
                href={item.href}
                className="grid grid-cols-[2rem_1fr] items-center border-b px-3 py-4 text-lg hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="font-heading">{item.label}</span>
              </Link>
            </SheetClose>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
