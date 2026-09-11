export const config = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseFile: process.env.DATABASE_FILE ?? "data/knowledge-inbox.db",
} as const;
