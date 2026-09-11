export interface RetrievedChunk {
  chunkId: string;
  itemId: string;
  chunkIndex: number;
  content: string;
  charStart: number;
  charEnd: number;
  score: number;
  itemTitle: string;
  itemSourceType: string;
  itemSourceUrl: string | null;
}

export interface RetrievalResult {
  chunks: RetrievedChunk[];
  // How many chunks were scored, for judging whether a weak answer means a thin library.
  candidateCount: number;
  tookMs: number;
}
