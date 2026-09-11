export const config = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseFile: process.env.DATABASE_FILE ?? "data/knowledge-inbox.db",
  urlFetch: {
    timeoutMs: Number(process.env.URL_FETCH_TIMEOUT_MS ?? 10_000),
    maxBytes: Number(process.env.URL_FETCH_MAX_BYTES ?? 2_000_000),
    userAgent: "KnowledgeInbox/0.1 (+https://github.com/Sompalkar/turium)",
  },
} as const;
