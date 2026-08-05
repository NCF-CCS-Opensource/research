import { describe, expect, it, vi } from "vitest"
import { createInMemoryTransport } from "./transport"
import { createAccountWorkspace } from "./account-workspace"
import { DomainApiError } from "./errors"

const researchRow = {
  id: "res_1",
  title: "Deep Modules",
  abstract: "An abstract",
  publish_date: "2026-01-01",
  status: "approved",
  uploader_id: "user_1",
  upload_complete: true,
  view_count: 1,
  download_count: 2,
  citation_export_count: 3,
  created_at: "2026-01-02T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
  authors: [],
  categories: [],
  keywords: [],
}

function makeModule(overrides: {
  userId?: string | null
  tables?: Record<string, Record<string, unknown>[]>
  rpc?: Record<string, unknown | ((params?: Record<string, unknown>) => unknown)>
} = {}) {
  const notifications = [
    {
      id: "n1",
      user_id: "user_1",
      research_id: "res_1",
      message: "approved",
      read: false,
      created_at: "2026-01-03T00:00:00Z",
    },
  ]
  const rpc = {
    admin_update_account: undefined,
    get_notifications: () =>
      notifications.filter((n) => n.user_id === "user_1"),
    mark_notifications_read: () => {
      for (const n of notifications)
        if (n.user_id === "user_1") n.read = true
    },
    ...overrides.rpc,
  }
  const tables = {
    profiles: [
      {
        id: "user_1",
        email: "a@b.c",
        first_name: "Ada",
        middle_name: null,
        last_name: "Lovelace",
        suffix: null,
        institution_id: "inst_1",
        program_id: "prog_1",
        role: "user",
        status: "active",
        created_at: "2026-01-01T00:00:00Z",
      },
    ],
    institutions: [{ id: "inst_1", name: "NCF" }],
    programs: [{ id: "prog_1", name: "BSCS", institution_id: "inst_1" }],
    categories: [{ id: "cat_1", name: "Computing" }],
    collections: [],
    public_research: [researchRow],
    ...overrides.tables,
  }
  const transport = createInMemoryTransport({
    userId: overrides.userId === undefined ? "user_1" : overrides.userId,
    rpc,
    tables,
  })
  return { transport, accountWorkspace: createAccountWorkspace(transport), notifications }
}

describe("accountWorkspace module", () => {
  it("returns profile settings with registration options", async () => {
    const { accountWorkspace } = makeModule()
    const settings = await accountWorkspace.getProfileSettings()
    expect(settings.profile).toMatchObject({
      first_name: "Ada",
      institution_id: "inst_1",
    })
    expect(settings.institutions).toEqual([
      { id: "inst_1", name: "NCF", institutionId: null },
    ])
    expect(settings.programs).toEqual([
      { id: "prog_1", name: "BSCS", institutionId: "inst_1" },
    ])
  })

  it("requires authentication for profile settings", async () => {
    const { accountWorkspace } = makeModule({ userId: null })
    await expect(accountWorkspace.getProfileSettings()).rejects.toBeInstanceOf(
      DomainApiError
    )
  })

  it("updates profile settings for the current user", async () => {
    const { accountWorkspace, transport } = makeModule()
    await accountWorkspace.updateProfileSettings({
      first_name: "Grace",
      middle_name: null,
      last_name: "Hopper",
      suffix: null,
      institution_id: "inst_1",
      program_id: null,
    })
    const [updated] = await transport.select<{ first_name: string }>("profiles", {
      eq: { id: "user_1" },
    })
    expect(updated.first_name).toBe("Grace")
  })

  it("returns a single profile's access state", async () => {
    const { accountWorkspace } = makeModule()
    await expect(accountWorkspace.getProfileAccess("user_1")).resolves.toEqual({
      role: "user",
      status: "active",
    })
  })

  it("lists profiles and updates accounts via RPC", async () => {
    const updateAccountRpc = vi.fn().mockReturnValue(undefined)
    const { accountWorkspace } = makeModule({
      rpc: { admin_update_account: updateAccountRpc },
    })
    const profiles = await accountWorkspace.getProfiles()
    expect(profiles[0]).toMatchObject({ id: "user_1", role: "user" })
    await accountWorkspace.updateAccount("user_2", "admin", "suspended")
    expect(updateAccountRpc).toHaveBeenCalledWith({
      target_id: "user_2",
      new_role: "admin",
      new_status: "suspended",
    })
  })

  it("adds, lists, and removes collection entries idempotently", async () => {
    const { accountWorkspace, transport } = makeModule({
      tables: {
        collections: [
          { user_id: "user_other", research_id: "res_1", created_at: "2026-01-01T00:00:00Z" },
        ],
      },
    })
    await accountWorkspace.addToCollection("res_1")
    await accountWorkspace.addToCollection("res_1")
    expect(await transport.select("collections")).toHaveLength(2)

    const collection = await accountWorkspace.getCollection()
    expect(collection).toHaveLength(1)
    expect(collection[0]).toMatchObject({
      researchId: "res_1",
      research: expect.objectContaining({ title: "Deep Modules" }),
    })

    await accountWorkspace.removeFromCollection("res_1")
    expect(await accountWorkspace.getCollection()).toEqual([])
  })

  it("requires authentication for collection mutations", async () => {
    const { accountWorkspace } = makeModule({ userId: null })
    await expect(accountWorkspace.addToCollection("res_1")).rejects.toBeInstanceOf(
      DomainApiError
    )
  })

  it("lists and marks notifications as read", async () => {
    const { accountWorkspace, notifications } = makeModule()
    await expect(accountWorkspace.getNotifications()).resolves.toHaveLength(1)
    await accountWorkspace.markNotificationsRead()
    expect(notifications[0].read).toBe(true)
  })

  it("manages category metadata", async () => {
    const { accountWorkspace, transport } = makeModule()
    await accountWorkspace.manageMetadata({
      action: "create",
      table: "categories",
      name: "  Robotics  ",
    })
    await accountWorkspace.manageMetadata({
      action: "rename",
      table: "categories",
      id: "cat_1",
      name: "Computer Science",
    })
    await expect(
      accountWorkspace.manageMetadata({ action: "list", table: "categories" })
    ).resolves.toEqual(
      expect.arrayContaining([
        { id: "cat_1", name: "Computer Science", institutionId: null },
        expect.objectContaining({ name: "Robotics" }),
      ])
    )
    await accountWorkspace.manageMetadata({
      action: "delete",
      table: "categories",
      id: "cat_1",
    })
    const rows = await transport.select<{ id: string }>("categories")
    expect(rows.map((r) => r.id)).not.toContain("cat_1")
  })

  it("manages program metadata with institution links", async () => {
    const { accountWorkspace } = makeModule()
    await accountWorkspace.manageMetadata({
      action: "create",
      table: "programs",
      name: "BSIT",
      institutionId: "inst_1",
    })
    await expect(
      accountWorkspace.manageMetadata({ action: "list", table: "programs" })
    ).resolves.toEqual(
      expect.arrayContaining([
        { id: "prog_1", name: "BSCS", institutionId: "inst_1" },
        expect.objectContaining({ name: "BSIT", institutionId: "inst_1" }),
      ])
    )
  })
})
