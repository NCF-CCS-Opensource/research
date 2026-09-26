import type { AccountRole } from "../domain/profile.entity"

export type RequestIdentity =
  | { state: "guest" }
  | { state: "registering"; clerkUserId: string; email: string }
  | {
      state: "active"
      profileId: string
      clerkUserId: string
      email: string
      role: AccountRole
    }
  | {
      state: "suspended"
      profileId: string
      clerkUserId: string
      email: string
      role: AccountRole
    }
