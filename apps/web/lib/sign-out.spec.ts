import { createElement, type ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { SignOut } from "@/components/auth/sign-out"

vi.mock("@clerk/nextjs", () => ({
  SignOutButton: ({
    children,
    redirectUrl,
  }: {
    children: ReactNode
    redirectUrl: string
  }) => createElement("span", { "data-redirect": redirectUrl }, children),
}))

describe("SignOut", () => {
  it("ends the Clerk session and returns to public discovery", () => {
    const markup = renderToStaticMarkup(createElement(SignOut))
    expect(markup).toContain('data-redirect="/"')
    expect(markup).toContain("Sign Out")
  })
})
