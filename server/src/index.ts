import "./preflight.js";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { getDb } from "./db/client.js";
import { logger } from "./lib/logger.js";
import { warmUpEmbedder } from "./services/embedder.js";
import { seedSampleData } from "./services/sample-data.js";

getDb();

createApp().listen(config.port, () => {
  logger.info("server listening", { port: config.port, env: config.nodeEnv });
});

// Load the model in the background so the first ingest is not the slow one, then
// seed if asked. Both happen after listen so the health check is not held up.
void warmUpEmbedder()
  .then(() => (config.seedSampleData ? seedSampleData(logger.child({ task: "seed" })) : undefined))
  .catch((error) => {
    logger.error("startup work failed", { message: error instanceof Error ? error.message : String(error) });
  });
