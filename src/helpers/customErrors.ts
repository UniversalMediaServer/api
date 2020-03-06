export const ValidationError = function(message: string): void {
  this.name = 'ValidationError';
  this.message = (message || '');
};
ValidationError.prototype = Error.prototype;
