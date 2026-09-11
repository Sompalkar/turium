import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { logger, type Logger } from "../lib/logger.js";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      log: Logger;
    }
  }
}

export function requestContext(req: Request, res: Response, next: NextFunction) {
  const requestId = req.header("x-request-id") ?? randomUUID();
  const startedAt = process.hrtime.bigint();

  req.requestId = requestId;
  req.log = logger.child({ requestId });
  res.setHeader("x-request-id", requestId);

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    req.log.info("request completed", {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(durationMs),
    });
  });

  next();
}
