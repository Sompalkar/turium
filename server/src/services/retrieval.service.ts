import { config } from "../config.js";
import type { RetrievalResult, RetrievedChunk } from "../domain/retrieval.js";
import { dotProduct } from "../lib/vector.js";
import { chunkRepository } from "../repositories/chunk.repository.js";
import { embedOne } from "./embedder.js";
import type { Logger } from "../lib/logger.js";

export interface RetrievalOptions {
  topK: number;
}

export async function retrieveRelevantChunks(
  question: string,
  options: RetrievalOptions,
  log: Logger,
): Promise<RetrievalResult> {
  const startedAt = Date.now();

  const candidates = chunkRepository.listEmbedded(config.embedding.model);
  if (candidates.length === 0) {
    log.warn("query ran against an empty library");
    return { chunks: [], candidateCount: 0, tookMs: Date.now() - startedAt };
  }

  const questionVector = await embedOne(question);

  // Brute force scan. Every chunk is scored, which is honest and fine at this size.
  const scored: RetrievedChunk[] = candidates
    .map((candidate) => ({
      chunkId: candidate.id,
      itemId: candidate.itemId,
      chunkIndex: candidate.chunkIndex,
      content: candidate.content,
      charStart: candidate.charStart,
      charEnd: candidate.charEnd,
      score: dotProduct(questionVector, candidate.embedding),
      itemTitle: candidate.itemTitle,
      itemSourceType: candidate.itemSourceType,
      itemSourceUrl: candidate.itemSourceUrl,
    }))
    .filter((chunk) => chunk.score >= config.retrieval.minScore)
    .sort((a, b) => b.score - a.score);

  const chunks = capPerItem(scored, config.retrieval.maxPerItem).slice(0, options.topK);

  log.info("retrieval finished", {
    candidateCount: candidates.length,
    matchCount: chunks.length,
    topScore: chunks[0]?.score ?? null,
    tookMs: Date.now() - startedAt,
  });

  return { chunks, candidateCount: candidates.length, tookMs: Date.now() - startedAt };
}

function capPerItem(chunks: RetrievedChunk[], maxPerItem: number): RetrievedChunk[] {
  const seen = new Map<string, number>();

  return chunks.filter((chunk) => {
    const used = seen.get(chunk.itemId) ?? 0;
    if (used >= maxPerItem) return false;
    seen.set(chunk.itemId, used + 1);
    return true;
  });
}
