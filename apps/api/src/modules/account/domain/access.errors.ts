import { DomainError } from "../../../common/errors/domain.error"

export class AccountSuspendedError extends DomainError {
  constructor() {
    super("ACCOUNT_SUSPENDED", "This account has been suspended.", 403)
  }
}

export class RegistrationRequiredError extends DomainError {
  constructor() {
    super(
      "REGISTRATION_REQUIRED",
      "Complete Registration before continuing.",
      403
    )
  }
}

export class AdminOnlyError extends DomainError {
  constructor() {
    super("ADMIN_ONLY", "This action requires an administrator.", 403)
  }
}
