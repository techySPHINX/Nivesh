// Base Exception Class
export abstract class BaseException extends Error {
  public readonly timestamp: Date;
  public readonly path?: string;
  public readonly method?: string;

  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: any,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    Error.captureStackTrace(this, this.constructor);
  }
}

// Domain Exceptions
export class DomainException extends BaseException {
  constructor(message: string, code: string = 'DOMAIN_ERROR', details?: any) {
    super(message, code, 400, details);
  }
}

export class EntityNotFoundException extends BaseException {
  constructor(entityName: string, identifier: string | number) {
    super(
      `${entityName} with identifier ${identifier} not found`,
      'ENTITY_NOT_FOUND',
      404,
      { entityName, identifier },
    );
  }
}

export class ValidationException extends BaseException {
  constructor(message: string, errors?: any[]) {
    super(message, 'VALIDATION_ERROR', 422, { errors });
  }
}

export class BusinessRuleViolationException extends BaseException {
  constructor(rule: string, message: string) {
    super(message, 'BUSINESS_RULE_VIOLATION', 400, { rule });
  }
}

// Infrastructure Exceptions
export class DatabaseException extends BaseException {
  constructor(message: string, originalError?: Error) {
    super(message, 'DATABASE_ERROR', 500, {
      originalMessage: originalError?.message,
      originalStack: originalError?.stack,
    });
  }
}

export class ExternalServiceException extends BaseException {
  constructor(serviceName: string, message: string, originalError?: Error) {
    super(
      `External service ${serviceName} error: ${message}`,
      'EXTERNAL_SERVICE_ERROR',
      502,
      {
        serviceName,
        originalMessage: originalError?.message,
      },
    );
  }
}

// Auth Exceptions
export class UnauthorizedException extends BaseException {
  constructor(message: string = 'Unauthorized access') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class ForbiddenException extends BaseException {
  constructor(message: string = 'Forbidden resource') {
    super(message, 'FORBIDDEN', 403);
  }
}

// Rate Limit Exception
export class RateLimitExceededException extends BaseException {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_EXCEEDED', 429);
  }
}

// Conflict Exception
export class ConflictException extends BaseException {
  constructor(message: string, details?: any) {
    super(message, 'CONFLICT', 409, details);
  }
}
