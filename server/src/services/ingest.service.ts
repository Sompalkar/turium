import { randomUUID } from "node:crypto";
import type { Item } from "../domain/item.js";
import type { IngestRequest } from "../schemas/ingest.schema.js";
import { itemRepository } from "../repositories/item.repository.js";
import { fetchPage } from "./url-fetcher.js";
import type { Logger } from "../lib/logger.js";

export async function ingestContent(request: IngestRequest, log: Logger): Promise<Item> {
  const draft = request.sourceType === "note" ? fromNote(request) : await fromUrl(request, log);

  const item: Item = { id: randomUUID(), createdAt: new Date().toISOString(), ...draft };

  itemRepository.insert(item);
  log.info("item ingested", {
    itemId: item.id,
    sourceType: item.sourceType,
    contentLength: item.content.length,
  });

  return item;
}

type ItemDraft = Omit<Item, "id" | "createdAt">;

function fromNote(request: Extract<IngestRequest, { sourceType: "note" }>): ItemDraft {
  return {
    sourceType: "note",
    title: request.title ?? deriveTitle(request.text),
    sourceUrl: null,
    content: request.text,
  };
}

async function fromUrl(
  request: Extract<IngestRequest, { sourceType: "url" }>,
  log: Logger,
): Promise<ItemDraft> {
  const page = await fetchPage(request.url, log);
  return {
    sourceType: "url",
    title: request.title ?? page.title ?? deriveTitle(page.text),
    sourceUrl: request.url,
    content: page.text,
  };
}

const MAX_DERIVED_TITLE = 80;

function deriveTitle(text: string): string {
  const firstLine = text.split("\n").map((line) => line.trim()).find(Boolean) ?? "Untitled";
  return firstLine.length > MAX_DERIVED_TITLE
    ? `${firstLine.slice(0, MAX_DERIVED_TITLE).trimEnd()}…`
    : firstLine;
}
