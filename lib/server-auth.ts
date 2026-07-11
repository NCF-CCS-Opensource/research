import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { API_ROOT } from "@/lib/api"
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  USER_ROLE_COOKIE,
} from "@/lib/auth-cookies"
import type { LoginResponse } from "@/types/api"

export { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, USER_ROLE_COOKIE }

const secure = process.env.NODE_ENV === "production"

export function setAuthCookies(response: NextResponse, payload: LoginResponse) {
  response.cookies.set(ACCESS_TOKEN_COOKIE, payload.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 15 * 60,
  })
  response.cookies.set(REFRESH_TOKEN_COOKIE, payload.refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  })
  response.cookies.set(USER_ROLE_COOKIE, payload.user.role, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  })
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.delete(ACCESS_TOKEN_COOKIE)
  response.cookies.delete(REFRESH_TOKEN_COOKIE)
  response.cookies.delete(USER_ROLE_COOKIE)
}

export async function getAccessToken() {
  return (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value ?? null
}

export async function getRefreshToken() {
  return (await cookies()).get(REFRESH_TOKEN_COOKIE)?.value ?? null
}

type RefreshOutcome = { accessToken: string | null; invalid: boolean }

// Concurrent requests on an expired access token (e.g. several dashboard
// panels firing at once) would otherwise each call /auth/refresh
// independently and race to write cookies on their own response, and could
// burn through the auth rate limit together. One in-flight call per refresh
// token is shared by all of them instead.
const refreshInFlight = new Map<string, Promise<RefreshOutcome>>()

async function requestRefresh(refreshToken: string): Promise<RefreshOutcome> {
  const backendResponse = await fetch(`${API_ROOT}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
    cache: "no-store",
  })

  // Rate-limited or a transient failure — the refresh token itself is still
  // good, so don't sign the user out over it; just fail this attempt.
  if (backendResponse.status === 429) return { accessToken: null, invalid: false }
  if (!backendResponse.ok) return { accessToken: null, invalid: true }

  const payload = (await backendResponse.json()) as { data: { accessToken: string } }
  return { accessToken: payload.data.accessToken, invalid: false }
}

export async function refreshAccessToken(response: NextResponse) {
  const refreshToken = await getRefreshToken()
  if (!refreshToken) return null

  let inFlight = refreshInFlight.get(refreshToken)
  if (!inFlight) {
    inFlight = requestRefresh(refreshToken).finally(() => {
      refreshInFlight.delete(refreshToken)
    })
    refreshInFlight.set(refreshToken, inFlight)
  }
  const { accessToken, invalid } = await inFlight

  if (accessToken) {
    response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 15 * 60,
    })
    return accessToken
  }

  if (invalid) clearAuthCookies(response)
  return null
}
