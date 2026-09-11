import { z } from "zod";
import { config } from "../config.js";

export const queryRequestSchema = z.object({
  question: z.string().trim().min(3, "question must be at least 3 characters").max(1_000),
  topK: z.number().int().min(1).max(20).default(config.retrieval.topK),
});

export type QueryRequest = z.infer<typeof queryRequestSchema>;

export const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type HistoryQuery = z.infer<typeof historyQuerySchema>;
