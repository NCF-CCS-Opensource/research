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

export async function refreshAccessToken(response: NextResponse) {
  const refreshToken = await getRefreshToken()
  if (!refreshToken) return null

  const backendResponse = await fetch(`${API_ROOT}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
    cache: "no-store",
  })

  if (!backendResponse.ok) {
    clearAuthCookies(response)
    return null
  }

  const payload = (await backendResponse.json()) as {
    data: { accessToken: string }
  }
  response.cookies.set(ACCESS_TOKEN_COOKIE, payload.data.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 15 * 60,
  })
  return payload.data.accessToken
}
