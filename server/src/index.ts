import "./preflight.js";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { getDb } from "./db/client.js";
import { logger } from "./lib/logger.js";
import { warmUpEmbedder } from "./services/embedder.js";

getDb();

createApp().listen(config.port, () => {
  logger.info("server listening", { port: config.port, env: config.nodeEnv });
});

// Load the model in the background so the first ingest is not the slow one.
void warmUpEmbedder().catch((error) => {
  logger.error("embedding model failed to load", { message: String(error) });
});
