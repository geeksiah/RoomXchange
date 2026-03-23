export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

export function assertFound<T>(value: T | null | undefined, message = "Resource not found.") {
  if (!value) {
    throw new AppError(404, message);
  }

  return value;
}

export function assert(condition: unknown, statusCode: number, message: string, details?: unknown): asserts condition {
  if (!condition) {
    throw new AppError(statusCode, message, details);
  }
}
