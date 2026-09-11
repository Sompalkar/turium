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
