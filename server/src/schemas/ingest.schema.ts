import { z } from "zod";

const MAX_NOTE_LENGTH = 50_000;

export const ingestRequestSchema = z.object({
  sourceType: z.literal("note"),
  text: z.string().trim().min(1, "text must not be empty").max(MAX_NOTE_LENGTH),
  title: z.string().trim().min(1).max(200).optional(),
});

export type IngestRequest = z.infer<typeof ingestRequestSchema>;

export const listItemsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListItemsQuery = z.infer<typeof listItemsQuerySchema>;
