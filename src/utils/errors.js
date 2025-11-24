export class AppError extends Error {
  constructor(message, statusCode = 500, details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    if (details) {
      this.details = details;
    }
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export function isAppError(error) {
  return error instanceof AppError;
}
