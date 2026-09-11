import { randomUUID } from "node:crypto";
import type { Item } from "../domain/item.js";
import type { IngestRequest } from "../schemas/ingest.schema.js";
import { itemRepository } from "../repositories/item.repository.js";
import type { Logger } from "../lib/logger.js";

export function ingestContent(request: IngestRequest, log: Logger): Item {
  const item: Item = {
    id: randomUUID(),
    sourceType: "note",
    title: request.title ?? deriveTitle(request.text),
    sourceUrl: null,
    content: request.text,
    createdAt: new Date().toISOString(),
  };

  itemRepository.insert(item);
  log.info("item ingested", {
    itemId: item.id,
    sourceType: item.sourceType,
    contentLength: item.content.length,
  });

  return item;
}

const MAX_DERIVED_TITLE = 80;

function deriveTitle(text: string): string {
  const firstLine = text.split("\n").map((line) => line.trim()).find(Boolean) ?? "Untitled note";
  return firstLine.length > MAX_DERIVED_TITLE
    ? `${firstLine.slice(0, MAX_DERIVED_TITLE).trimEnd()}…`
    : firstLine;
}
