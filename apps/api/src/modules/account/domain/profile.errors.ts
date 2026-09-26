import { DomainError } from "../../../common/errors/domain.error"

export class EmailDomainNotAllowedError extends DomainError {
  constructor() {
    super(
      "EMAIL_DOMAIN_NOT_ALLOWED",
      "Only NCF Google Accounts (gbox.ncf.edu.ph or ncf.edu.ph) may register.",
      400
    )
  }
}

export class ProfileAlreadyExistsError extends DomainError {
  constructor() {
    super(
      "PROFILE_ALREADY_EXISTS",
      "This account has already completed Registration.",
      409
    )
  }
}

export class ProgramNotFoundError extends DomainError {
  constructor() {
    super("PROGRAM_NOT_FOUND", "Select a Program from the list.", 400)
  }
}
