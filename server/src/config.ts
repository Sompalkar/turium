// Reads server/.env if it exists. Real deployments set real environment variables.
try {
  process.loadEnvFile();
} catch {
  // No .env file, which is fine.
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction: process.env.NODE_ENV === "production",
  databaseFile: process.env.DATABASE_FILE ?? "data/knowledge-inbox.db",
  // Browsers on another origin need to be named here. In development the Vite
  // proxy keeps everything same origin, so the list can stay empty.
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  urlFetch: {
    timeoutMs: Number(process.env.URL_FETCH_TIMEOUT_MS ?? 10_000),
    maxBytes: Number(process.env.URL_FETCH_MAX_BYTES ?? 2_000_000),
    userAgent: "KnowledgeInbox/0.1 (+https://github.com/Sompalkar/turium)",
  },
  embedding: {
    model: process.env.EMBEDDING_MODEL ?? "Xenova/all-MiniLM-L6-v2",
    // Point this at a persistent disk or the model is downloaded again on every deploy.
    cacheDir: process.env.EMBEDDING_CACHE_DIR ?? "",
    dimensions: Number(process.env.EMBEDDING_DIMENSIONS ?? 384),
    batchSize: Number(process.env.EMBEDDING_BATCH_SIZE ?? 16),
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY ?? "",
    model: process.env.ANSWER_MODEL ?? "claude-opus-5",
    maxTokens: Number(process.env.ANSWER_MAX_TOKENS ?? 1024),
  },
  retrieval: {
    topK: Number(process.env.RETRIEVAL_TOP_K ?? 5),
    minScore: Number(process.env.RETRIEVAL_MIN_SCORE ?? 0.15),
    // Stops one long document from filling every slot.
    maxPerItem: Number(process.env.RETRIEVAL_MAX_PER_ITEM ?? 3),
  },
  chunking: {
    maxChars: Number(process.env.CHUNK_MAX_CHARS ?? 900),
    overlapChars: Number(process.env.CHUNK_OVERLAP_CHARS ?? 150),
  },
} as const;
