import { createHmac } from "node:crypto"

import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const signingKey = "test-webhook-secret"
const signingSecret = `whsec_${Buffer.from(signingKey).toString("base64")}`

function clerkUserUpdatedEvent(overrides: Record<string, unknown> = {}) {
  return {
    type: "user.updated",
    data: {
      id: "user_123",
      updated_at: 1_786_032_000_000,
      primary_email_address_id: "email_123",
      email_addresses: [
        {
          id: "email_123",
          email_address: "current@example.edu",
          verification: { status: "verified" },
        },
      ],
      first_name: "Must not change",
      last_name: "Must not change",
      public_metadata: { role: "admin" },
      ...overrides,
    },
  }
}

function signedWebhookRequest(payload: unknown, validSignature = true) {
  const body = JSON.stringify(payload)
  const id = "msg_123"
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signature = createHmac("sha256", signingKey)
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64")

  return new NextRequest("http://localhost/api/webhooks/clerk", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/json",
      "svix-id": id,
      "svix-timestamp": timestamp,
      "svix-signature": `v1,${validSignature ? signature : "invalid"}`,
    },
  })
}

describe("Clerk webhook", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env.CLERK_WEBHOOK_SIGNING_SECRET = signingSecret
    process.env.SUPABASE_URL = "https://supabase.test"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-secret"
  })

  it("updates only the matching Profile Contact Email", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(Response.json([], { status: 200 })),
      );
    vi.stubGlobal("fetch", fetchMock)
    const { POST } = await import("@/app/api/webhooks/clerk/route")

    const response = await POST(signedWebhookRequest(clerkUserUpdatedEvent()))

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, options] = fetchMock.mock.calls[0]
    expect(String(url)).toContain(
      "/rest/v1/profiles?id=eq.user_123&clerk_email_updated_at=lt.1786032000000",
    )
    expect(JSON.parse(String(options.body))).toEqual({
      email: "current@example.edu",
      clerk_email_updated_at: 1_786_032_000_000,
    })
    expect(options.headers.get("authorization")).toBe(
      "Bearer service-role-secret",
    )
  })

  it("accepts retries without creating a Profile", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(Response.json([], { status: 200 })),
      );
    vi.stubGlobal("fetch", fetchMock)
    const { POST } = await import("@/app/api/webhooks/clerk/route")

    expect(
      (await POST(signedWebhookRequest(clerkUserUpdatedEvent()))).status
    ).toBe(200)
    expect(
      (await POST(signedWebhookRequest(clerkUserUpdatedEvent()))).status
    ).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(
      fetchMock.mock.calls.every(([, options]) => options.method === "PATCH"),
    ).toBe(true)
  })

  it("guards against reordered deliveries", async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(Response.json([], { status: 200 }))
    )
    vi.stubGlobal("fetch", fetchMock)
    const { POST } = await import("@/app/api/webhooks/clerk/route")
    const newer = clerkUserUpdatedEvent({ updated_at: 200 })
    const older = clerkUserUpdatedEvent({ updated_at: 100 })

    expect((await POST(signedWebhookRequest(newer))).status).toBe(200)
    expect((await POST(signedWebhookRequest(older))).status).toBe(200)
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "clerk_email_updated_at=lt.200"
    )
    expect(String(fetchMock.mock.calls[1][0])).toContain(
      "clerk_email_updated_at=lt.100"
    )
  })

  it("succeeds when no matching Profile exists", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json([], { status: 200 })),
    )
    const { POST } = await import("@/app/api/webhooks/clerk/route")

    expect(
      (await POST(signedWebhookRequest(clerkUserUpdatedEvent()))).status
    ).toBe(200)
  })

  it("rejects an invalid signature without touching data", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const { POST } = await import("@/app/api/webhooks/clerk/route")

    expect(
      (await POST(signedWebhookRequest(clerkUserUpdatedEvent(), false))).status
    ).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("rejects malformed user updates without touching data", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const { POST } = await import("@/app/api/webhooks/clerk/route")

    const response = await POST(
      signedWebhookRequest(
        clerkUserUpdatedEvent({ primary_email_address_id: "missing" })
      )
    )

    expect(response.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
