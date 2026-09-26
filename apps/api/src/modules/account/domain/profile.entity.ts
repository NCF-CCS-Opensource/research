import { randomUUID } from "node:crypto"
import { EmailDomainNotAllowedError } from "./profile.errors"

const NCF_EMAIL_DOMAINS = ["gbox.ncf.edu.ph", "ncf.edu.ph"]

export type AccountRole = "user" | "admin"
export type AccountStatus = "active" | "suspended"

export interface RegisterProfileProperties {
  clerkUserId: string
  fullName: string
  email: string
  programId: string | null
}

export interface ProfileProperties {
  id: string
  clerkUserId: string
  fullName: string
  email: string
  programId: string | null
  role: AccountRole
  status: AccountStatus
}

export class Profile {
  private constructor(
    readonly id: string,
    readonly clerkUserId: string,
    readonly fullName: string,
    readonly email: string,
    readonly programId: string | null,
    readonly role: AccountRole,
    readonly status: AccountStatus
  ) {}

  static register(props: RegisterProfileProperties): Profile {
    assertNcfEmail(props.email)
    return new Profile(
      randomUUID(),
      props.clerkUserId,
      props.fullName.trim(),
      props.email,
      props.programId,
      "user",
      "active"
    )
  }

  static fromProperties(props: ProfileProperties): Profile {
    return new Profile(
      props.id,
      props.clerkUserId,
      props.fullName,
      props.email,
      props.programId,
      props.role,
      props.status
    )
  }
}

function assertNcfEmail(email: string): void {
  const domain = email.split("@")[1]?.toLowerCase()
  if (!domain || !NCF_EMAIL_DOMAINS.includes(domain)) {
    throw new EmailDomainNotAllowedError()
  }
}
