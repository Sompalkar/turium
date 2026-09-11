export type SourceType = "note" | "url";

export interface ItemSummary {
  id: string;
  sourceType: SourceType;
  title: string;
  sourceUrl: string | null;
  preview: string;
  contentLength: number;
  createdAt: string;
}

export interface ItemListResponse {
  items: ItemSummary[];
  pagination: { limit: number; offset: number; total: number };
}

export interface IngestNoteRequest {
  sourceType: "note";
  text: string;
  title?: string;
}

export interface IngestUrlRequest {
  sourceType: "url";
  url: string;
  title?: string;
}

export type IngestRequest = IngestNoteRequest | IngestUrlRequest;

export interface AnswerSource {
  citation: number;
  chunkId: string;
  itemId: string;
  title: string;
  sourceType: SourceType;
  sourceUrl: string | null;
  snippet: string;
  score: number;
}

export interface QueryResponse {
  question: string;
  answer: string;
  sources: AnswerSource[];
  stats: {
    candidateChunks: number;
    retrievalMs: number;
    model: string;
    inputTokens: number;
    outputTokens: number;
  };
}
