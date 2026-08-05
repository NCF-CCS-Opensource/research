export class DomainApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string
  ) {
    super(message)
    this.name = "DomainApiError"
  }
}

export class NotFoundError extends DomainApiError {
  constructor(message = "Resource not found") {
    super(message, 404, "NOT_FOUND")
    this.name = "NotFoundError"
  }
}

export class ValidationError extends DomainApiError {
  constructor(message = "Validation failed") {
    super(message, 400, "VALIDATION_ERROR")
    this.name = "ValidationError"
  }
}

export class AccessDeniedError extends DomainApiError {
  constructor(message = "Access denied") {
    super(message, 403, "ACCESS_DENIED")
    this.name = "AccessDeniedError"
  }
}

export class AuthenticationError extends DomainApiError {
  constructor(message = "Authentication required") {
    super(message, 401, "AUTHENTICATION_ERROR")
    this.name = "AuthenticationError"
  }
}

export class CooldownActiveError extends DomainApiError {
  constructor(
    message = "Cooldown period active",
    readonly availableAt?: string
  ) {
    super(message, 409, "COOLDOWN_ACTIVE")
    this.name = "CooldownActiveError"
  }
}

export class TransportError extends DomainApiError {
  constructor(message: string, status = 500) {
    super(message, status, "TRANSPORT_ERROR")
    this.name = "TransportError"
  }
}
