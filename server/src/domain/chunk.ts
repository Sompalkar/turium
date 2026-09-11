export interface Chunk {
  id: string;
  itemId: string;
  chunkIndex: number;
  content: string;
  // Offsets into the item content, so a citation can point back to the exact passage.
  charStart: number;
  charEnd: number;
  embedding: Float32Array | null;
  embeddingModel: string | null;
}

// A chunk plus the item fields needed to show where it came from.
export interface EmbeddedChunk {
  id: string;
  itemId: string;
  chunkIndex: number;
  content: string;
  charStart: number;
  charEnd: number;
  embedding: Float32Array;
  itemTitle: string;
  itemSourceType: string;
  itemSourceUrl: string | null;
}
