import express from "express";
import { healthRouter } from "./routes/health.routes.js";
import { itemRouter } from "./routes/item.routes.js";
import { requestContext } from "./middleware/request-context.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";

export function createApp() {
  const app = express();

  app.use(requestContext);
  app.use(express.json({ limit: "1mb" }));

  app.use("/api", healthRouter);
  app.use("/api", itemRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
