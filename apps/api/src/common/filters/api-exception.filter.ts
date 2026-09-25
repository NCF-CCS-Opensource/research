import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common"
import type { Response } from "express"
import { DomainError } from "../errors/domain.error"
import { ValidationException } from "../errors/validation.exception"

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    // 1. Validation error (ADR 0004: invalid requests return 400 with authored field messages)
    if (exception instanceof ValidationException) {
      return response
        .status(exception.getStatus())
        .json(exception.getResponse())
    }

    // 2. Domain error (ADR 0004: domain errors return their code and authored message)
    if (exception instanceof DomainError) {
      return response.status(exception.status).json({
        code: exception.code,
        message: exception.message,
      })
    }

    // 3. Client HTTP errors (4xx, e.g. 401 Authentication required, 403 Forbidden)
    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      if (status >= 400 && status < 500) {
        const res = exception.getResponse()
        if (typeof res === "object" && res !== null) {
          return response.status(status).json(res)
        }
        return response.status(status).json({
          message: exception.message,
        })
      }
    }

    // 4. Anything else (ADR 0004: returns 500 with generic message while original error is logged)
    this.logger.error(
      "Unhandled exception caught",
      exception instanceof Error ? exception.stack : String(exception)
    )
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "Something went wrong. Please try again.",
    })
  }
}
