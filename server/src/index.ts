import "./preflight.js";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { getDb } from "./db/client.js";
import { logger } from "./lib/logger.js";
import { warmUpEmbedder } from "./services/embedder.js";

mkdirSync(dirname(config.databaseFile), { recursive: true });
getDb();

createApp().listen(config.port, () => {
  logger.info("server listening", { port: config.port, env: config.nodeEnv });
});

// Load the model in the background so the first ingest is not the slow one.
void warmUpEmbedder().catch((error) => {
  logger.error("embedding model failed to load", { message: String(error) });
});
