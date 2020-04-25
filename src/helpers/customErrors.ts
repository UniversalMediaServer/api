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
