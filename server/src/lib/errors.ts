 
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (code: string, message: string, details?: unknown) =>
  new AppError(400, code, message, details);

export const notFound = (message: string) => new AppError(404, "not_found", message);

export const badGateway = (code: string, message: string, details?: unknown) =>
  new AppError(502, code, message, details);
