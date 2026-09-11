import { getDb } from "../db/client.js";
import type { Chunk, EmbeddedChunk } from "../domain/chunk.js";
import { blobToVector, vectorToBlob } from "../lib/vector.js";

interface ChunkRow {
  id: string;
  item_id: string;
  chunk_index: number;
  content: string;
  char_start: number;
  char_end: number;
  embedding: Uint8Array | null;
  embedding_model: string | null;
}

interface EmbeddedChunkRow extends ChunkRow {
  embedding: Uint8Array;
  item_title: string;
  item_source_type: string;
  item_source_url: string | null;
}

export const chunkRepository = {
  insertMany(chunks: Chunk[]): void {
    if (chunks.length === 0) return;

    const statement = getDb().prepare(
      `INSERT INTO chunks (id, item_id, chunk_index, content, char_start, char_end, embedding, embedding_model)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    for (const chunk of chunks) {
      statement.run(
        chunk.id,
        chunk.itemId,
        chunk.chunkIndex,
        chunk.content,
        chunk.charStart,
        chunk.charEnd,
        chunk.embedding ? vectorToBlob(chunk.embedding) : null,
        chunk.embeddingModel,
      );
    }
  },

  listByItem(itemId: string): Chunk[] {
    const rows = getDb()
      .prepare(`SELECT * FROM chunks WHERE item_id = ? ORDER BY chunk_index`)
      .all(itemId) as unknown as ChunkRow[];
    return rows.map(toChunk);
  },

  // Every embedded chunk, for the brute force similarity scan.
  listEmbedded(model: string): EmbeddedChunk[] {
    const rows = getDb()
      .prepare(
        `SELECT c.*, i.title AS item_title, i.source_type AS item_source_type, i.source_url AS item_source_url
         FROM chunks c
         JOIN items i ON i.id = c.item_id
         WHERE c.embedding IS NOT NULL AND c.embedding_model = ?`,
      )
      .all(model) as unknown as EmbeddedChunkRow[];

    return rows.map((row) => ({
      id: row.id,
      itemId: row.item_id,
      chunkIndex: row.chunk_index,
      content: row.content,
      charStart: row.char_start,
      charEnd: row.char_end,
      embedding: blobToVector(row.embedding),
      itemTitle: row.item_title,
      itemSourceType: row.item_source_type,
      itemSourceUrl: row.item_source_url,
    }));
  },

  countAll(): number {
    const row = getDb().prepare(`SELECT COUNT(*) AS total FROM chunks`).get() as { total: number };
    return row.total;
  },
};

function toChunk(row: ChunkRow): Chunk {
  return {
    id: row.id,
    itemId: row.item_id,
    chunkIndex: row.chunk_index,
    content: row.content,
    charStart: row.char_start,
    charEnd: row.char_end,
    embedding: row.embedding ? blobToVector(row.embedding) : null,
    embeddingModel: row.embedding_model,
  };
}
