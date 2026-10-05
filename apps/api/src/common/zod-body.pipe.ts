import type { PipeTransform } from '@nestjs/common';
import type { z } from 'zod';
import { DomainError } from '../shared/domain/domain-error.js';

export class ZodBody<T extends z.ZodType> implements PipeTransform {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.infer<T> {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;
    const message = result.error.issues
      .map((issue) =>
        issue.path.length
          ? `${issue.path.join('.')}: ${issue.message}`
          : issue.message,
      )
      .join(' ');
    throw new DomainError('VALIDATION_FAILED', message, 'invalid');
  }
}
