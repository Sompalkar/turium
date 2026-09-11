/**
 * All environment-dependent values are read here and nowhere else,
 * so the rest of the code never touches `process.env` directly.
 */
export const config = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
} as const;
