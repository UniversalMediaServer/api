export class DeprecationError extends Error {
  constructor() {
    super();
    Error.captureStackTrace(this, DeprecationError);
    this.message = 'Metadata not found because request was made by an unsupported version of UMS.';
    this.name = 'DeprecationError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ExternalAPIError extends Error {
  constructor(message: string) {
    super(message);
    Error.captureStackTrace(this, ExternalAPIError);
    this.name = 'ExternalAPIError';
  }
}

export class MediaNotFoundError extends Error {
  constructor() {
    super();
    Error.captureStackTrace(this, MediaNotFoundError);
    this.message = 'Metadata not found.';
    this.name = 'MediaNotFoundError';
  }
}

export class RateLimitError extends Error {
  constructor() {
    super();
    Error.captureStackTrace(this, RateLimitError);
    this.message = 'Request was prevented by an upstream rate-limit, try again.';
    this.name = 'RateLimitError';
  }
}

export class IMDbIDNotFoundError extends MediaNotFoundError {
  constructor() {
    super();
    Error.captureStackTrace(this, IMDbIDNotFoundError);
    this.name = 'IMDbIDNotFoundError';
  }
}
