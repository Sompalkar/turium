import express from "express";
import { healthRouter } from "./routes/health.routes.js";

/**
 * Builds the Express app without starting it.
 * Keeping wiring separate from listening makes the app importable by tests.
 */
export function createApp() {
  const app = express();

  app.use(express.json({ limit: "1mb" }));

  app.use("/api", healthRouter);

  return app;
}
