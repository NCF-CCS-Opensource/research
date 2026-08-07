export type ProfileAccess = {
  role: "user" | "admin"
  status: "active" | "suspended"
}

const protectedRoutes = [
  "/dashboard",
  "/upload",
  "/admin",
  "/onboarding",
  "/suspended",
]

export function isProtectedRoute(pathname: string) {
  return (
    (pathname.startsWith("/research/") && pathname.endsWith("/request-pdf")) ||
    protectedRoutes.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    )
  )
}

export function authDestination(
  pathname: string,
  userId: string | null,
  profile: ProfileAccess | null,
  intendedPath = pathname
) {
  const loginRoute = pathname === "/login" || pathname.startsWith("/login/")
  const isProtected = isProtectedRoute(pathname)

  if (!userId) {
    return isProtected
      ? `/login?next=${encodeURIComponent(intendedPath)}`
      : null
  }
  if (!profile)
    return pathname === "/onboarding"
      ? null
      : `/onboarding?next=${encodeURIComponent(intendedPath)}`
  if (profile.status === "suspended")
    return pathname === "/suspended" ? null : "/suspended"
  if (pathname.startsWith("/admin") && profile.role !== "admin")
    return "/dashboard"
  if (pathname === "/suspended")
    return profile.role === "admin" ? "/admin" : "/dashboard"
  if (loginRoute || pathname === "/onboarding")
    return profile.role === "admin" ? "/admin" : "/dashboard"

  return null
}
