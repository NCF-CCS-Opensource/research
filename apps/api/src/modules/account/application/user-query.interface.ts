import type { UserSummary } from "@repo/contracts"

export const USER_QUERY = Symbol("USER_QUERY")

export interface UserQuery {
  list(): Promise<UserSummary[]>
  findById(profileId: string): Promise<UserSummary | null>
}
