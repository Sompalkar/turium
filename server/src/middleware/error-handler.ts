import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/errors.js";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: { code: "route_not_found", message: `No route for ${req.method} ${req.path}` },
    requestId: req.requestId,
  });
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof ZodError) {
    req.log.warn("request validation failed", { issues: error.issues });
    return res.status(400).json({
      error: {
        code: "validation_error",
        message: "Request body or query failed validation",
        details: error.issues.map((issue) => ({
          field: issue.path.join(".") || "(root)",
          message: issue.message,
        })),
      },
      requestId: req.requestId,
    });
  }

  // express.json throws this when the body is not valid JSON. That is the caller's fault.
  if (error instanceof SyntaxError && "body" in error) {
    req.log.warn("request body was not valid json");
    return res.status(400).json({
      error: { code: "malformed_json", message: "Request body is not valid JSON" },
      requestId: req.requestId,
    });
  }

  if (error instanceof AppError) {
    req.log.warn("request rejected", { code: error.code, status: error.status });
    return res.status(error.status).json({
      error: { code: error.code, message: error.message, details: error.details },
      requestId: req.requestId,
    });
  }

  // Unexpected: log the real cause, tell the caller nothing but the request id.
  req.log.error("unhandled error", {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  return res.status(500).json({
    error: { code: "internal_error", message: "Something went wrong on our side" },
    requestId: req.requestId,
  });
}
