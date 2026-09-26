import { DomainError } from "../../../common/errors/domain.error"

export class InvalidProgramNameError extends DomainError {
  constructor() {
    super("INVALID_PROGRAM_NAME", "Program name cannot be empty", 400)
  }
}
