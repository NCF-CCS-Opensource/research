export class DomainApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    options?: ErrorOptions
  ) {
    super(message, options)
  }
}

export const USER_ERROR_MESSAGE = "Something went wrong. Please try again."

export class AccessDeniedError extends DomainApiError {
  constructor(message = "Access denied", options?: ErrorOptions) {
    super(message, 403, options)
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
  const cause = new Error(message)
  if (code === "P0001") return new DomainApiError(message, 400, { cause })
  if (code === "42501") return new AccessDeniedError(message, { cause })
  if (code === "PGRST116") {
    return new DomainApiError("That record isn't available.", 404, { cause })
  }
  if (code === "23505") {
    return new DomainApiError("That name is already taken.", fallback, {
      cause,
    })
  }
  if (code === "23503") {
    return new DomainApiError(
      "Something still refers to this; remove those first.",
      fallback,
      { cause }
    )
  }
  return new DomainApiError(USER_ERROR_MESSAGE, fallback, { cause })
}
