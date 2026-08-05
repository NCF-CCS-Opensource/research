export class DomainApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
  }
}

export class AccessDeniedError extends DomainApiError {
  constructor(message = "Access denied") {
    super(message, 403)
  }
}

export class ValidationError extends DomainApiError {
  constructor(message: string) {
    super(message, 400)
  }
}

export class NotFoundError extends DomainApiError {
  constructor(message = "Not found") {
    super(message, 404)
  }
}

export function normalizeDomainError(
  message: string,
  code?: string | null,
  fallback = 500
): DomainApiError {
  if (code === "PGRST116") return new NotFoundError(message)
  if (code === "42501") return new AccessDeniedError(message)
  return new DomainApiError(message, fallback)
}
