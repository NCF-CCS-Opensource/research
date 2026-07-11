import { NextRequest, NextResponse } from "next/server"

import { API_ROOT } from "@/lib/api"
import { getAccessToken, refreshAccessToken } from "@/lib/server-auth"

const methodsWithBody = new Set(["POST", "PUT", "PATCH", "DELETE"])

async function proxy(request: NextRequest, context: { params: Promise<unknown> }) {
  const { path } = (await context.params) as { path: string[] }
  const target = new URL(`${API_ROOT}/${path.join("/")}`)
  request.nextUrl.searchParams.forEach((value, key) => target.searchParams.set(key, value))

  const cookieCarrier = NextResponse.json({})
  const token = await getAccessToken()

  const body = methodsWithBody.has(request.method) ? await request.text() : undefined
  const makeBackendRequest = (accessToken: string | null) =>
    fetch(target, {
      method: request.method,
      headers: {
        "Content-Type": request.headers.get("content-type") ?? "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body,
      cache: "no-store",
    })

  let backendResponse = await makeBackendRequest(token)

  // Attempt a refresh on any 401 — not just when an access token was present
  // and got rejected. The access-token cookie expires (15m) and disappears
  // from the jar entirely well before the refresh token (7d) does, so a
  // request can hit this route with no access token at all while a perfectly
  // valid refresh token still sits in the jar; skipping refresh in that case
  // forwarded a raw 401 straight to the client and forced a needless logout.
  if (backendResponse.status === 401) {
    const { accessToken, invalid } = await refreshAccessToken(cookieCarrier)
    if (!accessToken) {
      // A rate-limited refresh isn't a real logout — surface it as 429 so the
      // client doesn't hard-redirect to /login. Otherwise the browser bounces
      // straight back here (cookies are still valid) and re-fires the same
      // request batch, looping until the rate limit clears on its own.
      // refreshAccessToken wrote cookie-deletion headers onto cookieCarrier
      // for the genuinely-invalid case — propagate them so the browser
      // doesn't keep stale cookies proxy.ts would otherwise bounce on.
      const failedResponse = invalid
        ? NextResponse.json(
            { statusCode: 401, message: "Session expired. Sign in again." },
            { status: 401 },
          )
        : NextResponse.json(
            { statusCode: 429, message: "Too many requests. Try again shortly." },
            { status: 429 },
          )
      cookieCarrier.cookies.getAll().forEach((cookie) => failedResponse.cookies.set(cookie))
      return failedResponse
    }
    backendResponse = await makeBackendRequest(accessToken)
  }

  const payload = await backendResponse.text()
  const proxiedResponse = new NextResponse(payload, {
    status: backendResponse.status,
    headers: { "Content-Type": backendResponse.headers.get("content-type") ?? "application/json" },
  })
  cookieCarrier.cookies.getAll().forEach((cookie) => proxiedResponse.cookies.set(cookie))
  return proxiedResponse
}

export const GET = proxy
export const POST = proxy
export const PATCH = proxy
export const PUT = proxy
export const DELETE = proxy
