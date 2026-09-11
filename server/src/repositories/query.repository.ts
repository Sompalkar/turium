import { getDb } from "../db/client.js";
import type { AnswerSource, QueryRecord } from "../domain/query-record.js";

interface QueryRow {
  id: string;
  question: string;
  answer: string;
  sources: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  candidate_chunks: number;
  retrieval_ms: number;
  created_at: string;
}

export const queryRepository = {
  insert(record: QueryRecord): void {
    getDb()
      .prepare(
        `INSERT INTO queries
           (id, question, answer, sources, model, input_tokens, output_tokens,
            candidate_chunks, retrieval_ms, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.question,
        record.answer,
        JSON.stringify(record.sources),
        record.model,
        record.inputTokens,
        record.outputTokens,
        record.candidateChunks,
        record.retrievalMs,
        record.createdAt,
      );
  },

  listRecent(limit: number): QueryRecord[] {
    const rows = getDb()
      .prepare(`SELECT * FROM queries ORDER BY created_at DESC, id DESC LIMIT ?`)
      .all(limit) as unknown as QueryRow[];
    return rows.map(toRecord);
  },

  countAll(): number {
    const row = getDb().prepare(`SELECT COUNT(*) AS total FROM queries`).get() as { total: number };
    return row.total;
  },

  deleteAll(): number {
    const before = queryRepository.countAll();
    getDb().prepare(`DELETE FROM queries`).run();
    return before;
  },
};

function toRecord(row: QueryRow): QueryRecord {
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    sources: JSON.parse(row.sources) as AnswerSource[],
    model: row.model,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    candidateChunks: row.candidate_chunks,
    retrievalMs: row.retrieval_ms,
    createdAt: row.created_at,
  };
}
