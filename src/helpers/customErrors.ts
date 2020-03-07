export const ValidationError = function ValidationError(message: string): void {
  const error = Error.call(this, message);

  this.name = 'ValidationError';
  this.message = error.message;
  this.stack = error.stack;
};

ValidationError.prototype = Object.create(Error.prototype);
ValidationError.prototype.constructor = ValidationError;
