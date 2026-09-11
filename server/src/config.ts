export const config = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseFile: process.env.DATABASE_FILE ?? "data/knowledge-inbox.db",
  urlFetch: {
    timeoutMs: Number(process.env.URL_FETCH_TIMEOUT_MS ?? 10_000),
    maxBytes: Number(process.env.URL_FETCH_MAX_BYTES ?? 2_000_000),
    userAgent: "KnowledgeInbox/0.1 (+https://github.com/Sompalkar/turium)",
  },
  embedding: {
    model: process.env.EMBEDDING_MODEL ?? "Xenova/all-MiniLM-L6-v2",
    dimensions: Number(process.env.EMBEDDING_DIMENSIONS ?? 384),
    batchSize: Number(process.env.EMBEDDING_BATCH_SIZE ?? 16),
  },
  chunking: {
    maxChars: Number(process.env.CHUNK_MAX_CHARS ?? 900),
    overlapChars: Number(process.env.CHUNK_OVERLAP_CHARS ?? 150),
  },
} as const;
