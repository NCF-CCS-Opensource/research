import { describe, expect, it } from "vitest"

import { authDestination, isProtectedRoute } from "./auth-routing"

describe("authentication routing", () => {
  it.each([
    [
      "signed-out session preserves a protected destination",
      "/dashboard/papers",
      null,
      null,
      "/login?next=%2Fdashboard%2Fpapers",
    ],
    ["Guest keeps public discovery", "/search", null, null, null],
    [
      "missing Profile starts onboarding",
      "/dashboard",
      "user_1",
      null,
      "/onboarding?next=%2Fdashboard",
    ],
    [
      "suspended User sees the suspension page",
      "/dashboard",
      "user_1",
      { role: "user", status: "suspended" },
      "/suspended",
    ],
    [
      "active User reaches their workspace",
      "/dashboard",
      "user_1",
      { role: "user", status: "active" },
      null,
    ],
    [
      "non-Admin cannot enter Admin routes",
      "/admin",
      "user_1",
      { role: "user", status: "active" },
      "/dashboard",
    ],
    [
      "returning Admin defaults to Admin",
      "/login",
      "user_1",
      { role: "admin", status: "active" },
      "/admin",
    ],
    [
      "returning User defaults to their workspace",
      "/login",
      "user_1",
      { role: "user", status: "active" },
      "/dashboard",
    ],
    [
      "returning User does not revisit registration",
      "/register",
      "user_1",
      { role: "user", status: "active" },
      "/dashboard",
    ],
  ] as const)("%s", (_name, pathname, userId, profile, destination) => {
    expect(authDestination(pathname, userId, profile)).toBe(destination)
  })

  it("preserves a protected destination's query", () => {
    expect(
      authDestination(
        "/dashboard/papers",
        null,
        null,
        "/dashboard/papers?page=2"
      )
    ).toBe("/login?next=%2Fdashboard%2Fpapers%3Fpage%3D2")
  })

  it("preserves a profile-less User's intended destination", () => {
    expect(
      authDestination(
        "/dashboard/papers",
        "user_1",
        null,
        "/dashboard/papers?page=2"
      )
    ).toBe("/onboarding?next=%2Fdashboard%2Fpapers%3Fpage%3D2")
  })

  it("identifies protected routing boundaries", () => {
    expect(isProtectedRoute("/search")).toBe(false)
    expect(isProtectedRoute("/api/public")).toBe(false)
    expect(isProtectedRoute("/login")).toBe(false)
    expect(isProtectedRoute("/dashboard/papers")).toBe(true)
    expect(isProtectedRoute("/research/paper-1/request-pdf")).toBe(true)
  })
})
