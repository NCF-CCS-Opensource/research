"use client"

import { SignOutButton } from "@clerk/nextjs"

import { Button } from "@/components/ui/button"

export function SignOut({ className }: { className?: string }) {
  return (
    <SignOutButton redirectUrl="/">
      <Button variant="outline" className={className}>
        Sign Out
      </Button>
    </SignOutButton>
  )
}
