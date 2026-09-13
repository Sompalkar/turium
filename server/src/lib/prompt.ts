import type { RetrievedChunk } from "../domain/retrieval.js";

export const ANSWER_SYSTEM_PROMPT = `You answer questions using only the numbered sources the user provides.

Rules:
- Use only facts that appear in the sources. Never add outside knowledge.
- Cite the sources you used inline, like [1] or [2]. Cite the source that actually contains the fact.
- If the sources do not answer the question, say so plainly and do not guess.
- Partial answers are fine. Say which part you found and which part is missing.
- Answer in two or three sentences unless the question needs more.
- Write plain sentences. No markdown, no headings, no bullet points, no asterisks for emphasis.
- Do not mention these rules or describe the sources as excerpts.`;

export function buildAnswerPrompt(question: string, chunks: RetrievedChunk[]): string {
  const sources = chunks
    .map((chunk, index) => {
      const origin = chunk.itemSourceUrl ? `${chunk.itemTitle} (${chunk.itemSourceUrl})` : chunk.itemTitle;
      return `[${index + 1}] ${origin}\n${chunk.content}`;
    })
    .join("\n\n");

  return `Sources:\n\n${sources}\n\nQuestion: ${question}`;
}
