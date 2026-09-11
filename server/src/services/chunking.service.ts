import { randomUUID } from "node:crypto";
import { config } from "../config.js";
import type { Chunk } from "../domain/chunk.js";
import type { Item } from "../domain/item.js";
import { chunkText } from "../lib/chunker.js";
import { chunkRepository } from "../repositories/chunk.repository.js";
import type { Logger } from "../lib/logger.js";

export function storeChunksForItem(item: Item, log: Logger): Chunk[] {
  const chunks: Chunk[] = chunkText(item.content, config.chunking).map((chunk, index) => ({
    id: randomUUID(),
    itemId: item.id,
    chunkIndex: index,
    content: chunk.text,
    charStart: chunk.charStart,
    charEnd: chunk.charEnd,
  }));

  chunkRepository.insertMany(chunks);
  log.info("item chunked", { itemId: item.id, chunkCount: chunks.length });

  return chunks;
}
