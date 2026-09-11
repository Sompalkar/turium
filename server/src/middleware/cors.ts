import cors from "cors";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";

// Requests with no Origin header are curl, health checks and same origin calls.
export function corsMiddleware() {
  if (config.allowedOrigins.length === 0) {
    if (config.isProduction) {
      logger.warn("ALLOWED_ORIGINS is empty, so a browser on another origin will be refused");
    }
    return cors({ origin: false });
  }

  logger.info("cors enabled", { allowedOrigins: config.allowedOrigins });

  return cors({
    origin(origin, callback) {
      if (!origin || config.allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      logger.warn("blocked a cross origin request", { origin });
      callback(null, false);
    },
    methods: ["GET", "POST", "DELETE"],
  });
}
