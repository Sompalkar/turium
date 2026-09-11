import { randomUUID } from "node:crypto";
import { config } from "../config.js";
import type { Chunk } from "../domain/chunk.js";
import type { Item } from "../domain/item.js";
import { chunkText } from "../lib/chunker.js";
import { embedTexts } from "./embedder.js";

export function buildChunks(item: Item): Chunk[] {
  return chunkText(item.content, config.chunking).map((chunk, index) => ({
    id: randomUUID(),
    itemId: item.id,
    chunkIndex: index,
    content: chunk.text,
    charStart: chunk.charStart,
    charEnd: chunk.charEnd,
    embedding: null,
    embeddingModel: null,
  }));
}

export async function embedChunks(chunks: Chunk[]): Promise<Chunk[]> {
  const vectors = await embedTexts(chunks.map((chunk) => chunk.content));

  return chunks.map((chunk, index) => ({
    ...chunk,
    embedding: vectors[index] ?? null,
    embeddingModel: vectors[index] ? config.embedding.model : null,
  }));
}
