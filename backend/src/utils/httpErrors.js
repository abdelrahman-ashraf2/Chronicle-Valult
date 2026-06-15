export class HttpError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class BadRequestError extends HttpError {
  constructor(message = "Bad request.", details) {
    super(400, message, details);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "Authentication is required.") {
    super(401, message);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = "You do not have access to this resource.") {
    super(403, message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Resource not found.") {
    super(404, message);
  }
}
