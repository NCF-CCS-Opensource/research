import { clerkMiddleware } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

import { isProtectedRoute } from "@/lib/auth-routing"

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth()
  const pathname = request.nextUrl.pathname
  if (userId || !isProtectedRoute(pathname)) return NextResponse.next()

  const url = new URL("/login", request.url)
  url.searchParams.set("next", `${pathname}${request.nextUrl.search}`)
  return NextResponse.redirect(url)
})

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
}
