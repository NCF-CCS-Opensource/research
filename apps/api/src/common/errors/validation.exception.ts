import { HttpException, HttpStatus } from "@nestjs/common"
import type { ZodError } from "zod"

export interface ValidationErrorField {
  field: string
  message: string
}

export class ValidationException extends HttpException {
  constructor(readonly errors: ValidationErrorField[]) {
    super(
      {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        errors,
      },
      HttpStatus.BAD_REQUEST
    )
  }

  static fromZodError(error: ZodError): ValidationException {
    const errors = error.errors.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    }))
    return new ValidationException(errors)
  }
}
