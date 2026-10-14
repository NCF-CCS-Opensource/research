import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  DomainError,
  type DomainErrorKind,
} from '../shared/domain/domain-error.js';

const STATUS: Record<DomainErrorKind, number> = {
  invalid: 400,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  unavailable: 503,
};

@Catch()
export class ErrorEnvelopeFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorEnvelopeFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const meta = { requestId: res.locals.requestId };
    const send = (status: number, code: string, message: string) =>
      res.status(status).json({ error: { code, message }, meta });

    if (exception instanceof DomainError) {
      return send(STATUS[exception.kind], exception.code, exception.message);
    }
    if (exception instanceof HttpException && exception.getStatus() < 500) {
      const status = exception.getStatus();
      return status === 404
        ? send(404, 'NOT_FOUND', 'Not found.')
        : send(status, 'BAD_REQUEST', 'The request could not be processed.');
    }
    this.logger.error(
      exception instanceof Error
        ? (exception.stack ?? exception.message)
        : String(exception),
    );
    return send(
      500,
      'INTERNAL_ERROR',
      'Something went wrong. Please try again.',
    );
  }
}
