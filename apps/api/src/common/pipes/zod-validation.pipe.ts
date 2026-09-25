import {
  Injectable,
  Optional,
  type PipeTransform,
} from "@nestjs/common"
import type { ZodSchema } from "zod"
import { ValidationException } from "../errors/validation.exception"

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(@Optional() private readonly schema?: ZodSchema) {}

  transform(value: unknown) {
    if (!this.schema) {
      return value
    }

    const result = this.schema.safeParse(value)
    if (!result.success) {
      throw ValidationException.fromZodError(result.error)
    }

    return result.data
  }
}
