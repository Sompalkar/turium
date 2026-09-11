export interface AnswerSource {
  citation: number;
  chunkId: string;
  itemId: string;
  title: string;
  sourceType: string;
  sourceUrl: string | null;
  snippet: string;
  score: number;
}

// A question, the answer it produced and the sources behind it, kept so the
// history survives a refresh.
export interface QueryRecord {
  id: string;
  question: string;
  answer: string;
  sources: AnswerSource[];
  model: string;
  inputTokens: number;
  outputTokens: number;
  candidateChunks: number;
  retrievalMs: number;
  createdAt: string;
}

export interface QueryResponse {
  id: string;
  question: string;
  answer: string;
  sources: AnswerSource[];
  createdAt: string;
  stats: {
    candidateChunks: number;
    retrievalMs: number;
    model: string;
    inputTokens: number;
    outputTokens: number;
  };
}

// Storage keeps the numbers flat, the API groups them under stats.
export function toQueryResponse(record: QueryRecord): QueryResponse {
  return {
    id: record.id,
    question: record.question,
    answer: record.answer,
    sources: record.sources,
    createdAt: record.createdAt,
    stats: {
      candidateChunks: record.candidateChunks,
      retrievalMs: record.retrievalMs,
      model: record.model,
      inputTokens: record.inputTokens,
      outputTokens: record.outputTokens,
    },
  };
}
