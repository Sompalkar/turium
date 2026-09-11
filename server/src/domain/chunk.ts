export interface Chunk {
  id: string;
  itemId: string;
  chunkIndex: number;
  content: string;
  // Offsets into the item content, so a citation can point back to the exact passage.
  charStart: number;
  charEnd: number;
}
