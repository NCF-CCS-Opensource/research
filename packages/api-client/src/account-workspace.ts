import type {
  AccountAccess,
  AccountProfile,
  AccountStatus,
  CollectionItem,
  MetadataItem,
  MetadataTable,
  Notification,
  ProfileSettings,
  ProfileSettingsInput,
  ResearchDetail,
  ResearchRow,
  UserRole,
} from "./types"
import { mapResearch } from "./types"
import { requireAuth, type TransportAdapter } from "./transport"
import { ValidationError } from "./errors"

const MAX_NAME_LENGTH = 200
const MAX_SUFFIX_LENGTH = 20

function validateProfileInput(input: ProfileSettingsInput): void {
  if (!input.first_name?.trim()) {
    throw new ValidationError("First name is required")
  }
  if (input.first_name.length > MAX_NAME_LENGTH) {
    throw new ValidationError(`First name must be ${MAX_NAME_LENGTH} characters or fewer`)
  }
  if (!input.last_name?.trim()) {
    throw new ValidationError("Last name is required")
  }
  if (input.last_name.length > MAX_NAME_LENGTH) {
    throw new ValidationError(`Last name must be ${MAX_NAME_LENGTH} characters or fewer`)
  }
  if (input.middle_name != null && input.middle_name.length > MAX_NAME_LENGTH) {
    throw new ValidationError(`Middle name must be ${MAX_NAME_LENGTH} characters or fewer`)
  }
  if (input.suffix != null && input.suffix.length > MAX_SUFFIX_LENGTH) {
    throw new ValidationError(`Suffix must be ${MAX_SUFFIX_LENGTH} characters or fewer`)
  }
}

export type ManageMetadataRequest =
  | { action: "list"; table: MetadataTable }
  | {
      action: "create"
      table: MetadataTable
      name: string
      institutionId?: string
    }
  | {
      action: "rename"
      table: MetadataTable
      id: string
      name: string
      institutionId?: string
    }
  | { action: "delete"; table: MetadataTable; id: string }

export type AccountWorkspace = {
  getProfileSettings(): Promise<ProfileSettings>
  updateProfileSettings(input: ProfileSettingsInput): Promise<void>
  getProfileAccess(id: string): Promise<AccountAccess>
  getProfiles(): Promise<AccountProfile[]>
  updateAccount(id: string, role: UserRole, status: AccountStatus): Promise<void>
  getCollection(): Promise<CollectionItem[]>
  addToCollection(researchId: string): Promise<void>
  removeFromCollection(researchId: string): Promise<void>
  getNotifications(): Promise<Notification[]>
  markNotificationsRead(): Promise<void>
  manageMetadata<T>(request: ManageMetadataRequest): Promise<T>
}

export function createAccountWorkspace(
  adapter: TransportAdapter
): AccountWorkspace {
  const requireCurrentUser = requireAuth(adapter)

  async function manageMetadata<T>(request: ManageMetadataRequest): Promise<T> {
    const table = request.table
    if (table === "programs") {
      if (request.action === "create") {
        await adapter.insert("programs", {
          name: request.name.trim(),
          institution_id: request.institutionId || null,
        })
        return undefined as T
      }
      if (request.action === "rename") {
        await adapter.update(
          "programs",
          {
            name: request.name.trim(),
            institution_id: request.institutionId || null,
          },
          { id: request.id }
        )
        return undefined as T
      }
      if (request.action === "delete") {
        await adapter.remove("programs", { id: request.id })
        return undefined as T
      }
    }

    if (request.action === "list") {
      if (table === "programs") {
        const rows = await adapter.select<{
          id: string
          name: string
          institution_id: string | null
        }>("programs", { columns: "id,name,institution_id", order: { column: "name" } })
        return rows.map((item) => ({
          id: item.id,
          name: item.name,
          institutionId: item.institution_id,
        })) as T
      }
      const rows = await adapter.select<{ id: string; name: string }>(table, {
        columns: "id,name",
        order: { column: "name" },
      })
      return rows.map((item) => ({
        id: item.id,
        name: item.name,
        institutionId: null,
      })) as T
    }

    if (request.action === "create") {
      await adapter.insert(table, { name: request.name.trim() })
      return undefined as T
    }
    if (request.action === "rename") {
      await adapter.update(table, { name: request.name.trim() }, { id: request.id })
      return undefined as T
    }
    await adapter.remove(table, { id: request.id })
    return undefined as T
  }

  return {
    async getProfileSettings() {
      const userId = await requireCurrentUser()
      const [profile, institutions, programs] = await Promise.all([
        adapter.selectOne<ProfileSettings["profile"]>("profiles", {
          columns:
            "first_name,middle_name,last_name,suffix,institution_id,program_id",
          eq: { id: userId },
        }),
        adapter.select<{ id: string; name: string }>("institutions", {
          columns: "id,name",
          order: { column: "name" },
        }),
        adapter.select<{
          id: string
          name: string
          institution_id: string | null
        }>("programs", {
          columns: "id,name,institution_id",
          order: { column: "name" },
        }),
      ])
      return {
        profile,
        institutions: institutions.map((item) => ({
          id: item.id,
          name: item.name,
          institutionId: null,
        })),
        programs: programs.map((item) => ({
          id: item.id,
          name: item.name,
          institutionId: item.institution_id,
        })),
      }
    },

    async updateProfileSettings(input) {
      validateProfileInput(input)
      const userId = await requireCurrentUser()
      await adapter.update(
        "profiles",
        { ...input, updated_at: new Date().toISOString() },
        { id: userId }
      )
    },

    async getProfileAccess(id) {
      return adapter.selectOne<AccountAccess>("profiles", {
        columns: "role,status",
        eq: { id },
      })
    },

    async getProfiles() {
      return adapter.select<AccountProfile>("profiles", {
        columns: "id,email,first_name,last_name,role,status",
        order: { column: "created_at" },
      })
    },

    async updateAccount(id, role, status) {
      if (!id?.trim()) {
        throw new ValidationError("Account ID is required")
      }
      if (!["user", "admin"].includes(role)) {
        throw new ValidationError("Invalid role")
      }
      if (!["active", "suspended"].includes(status)) {
        throw new ValidationError("Invalid status")
      }
      await adapter.rpc("admin_update_account", {
        target_id: id,
        new_role: role,
        new_status: status,
      })
    },

    async getCollection() {
      const userId = await requireCurrentUser()
      const saved = await adapter.select<{
        research_id: string
        created_at: string
      }>("collections", {
        columns: "research_id,created_at",
        eq: { user_id: userId },
        order: { column: "created_at", ascending: false },
      })
      const ids = saved.map(({ research_id }) => research_id)
      if (!ids.length) return []
      const research = await adapter.select<ResearchRow>("public_research", {
        in: { column: "id", values: ids },
      })
      const byId = new Map(research.map((row) => [row.id, mapResearch(row)]))
      return saved.flatMap((item) => {
        const record = byId.get(item.research_id) as ResearchDetail | undefined
        return record
          ? [
              {
                researchId: item.research_id,
                createdAt: item.created_at,
                research: record,
              },
            ]
          : []
      })
    },

    async addToCollection(researchId) {
      const userId = await requireCurrentUser()
      await adapter.insert(
        "collections",
        { user_id: userId, research_id: researchId },
        { upsert: true, onConflict: "user_id,research_id" }
      )
    },

    async removeFromCollection(researchId) {
      const userId = await requireCurrentUser()
      await adapter.remove("collections", {
        user_id: userId,
        research_id: researchId,
      })
    },

    async getNotifications() {
      return adapter.rpc<Notification[]>("get_notifications")
    },

    async markNotificationsRead() {
      await adapter.rpc("mark_notifications_read")
    },

    manageMetadata,
  }
}
