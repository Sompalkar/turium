import { getDb } from "../db/client.js";
import type { Chunk } from "../domain/chunk.js";

interface ChunkRow {
  id: string;
  item_id: string;
  chunk_index: number;
  content: string;
  char_start: number;
  char_end: number;
}

export const chunkRepository = {
  insertMany(chunks: Chunk[]): void {
    if (chunks.length === 0) return;

    const db = getDb();
    const statement = db.prepare(
      `INSERT INTO chunks (id, item_id, chunk_index, content, char_start, char_end)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );

    // One transaction so a half written item can never be left behind.
    db.exec("BEGIN");
    try {
      for (const chunk of chunks) {
        statement.run(chunk.id, chunk.itemId, chunk.chunkIndex, chunk.content, chunk.charStart, chunk.charEnd);
      }
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  },

  listByItem(itemId: string): Chunk[] {
    const rows = getDb()
      .prepare(`SELECT * FROM chunks WHERE item_id = ? ORDER BY chunk_index`)
      .all(itemId) as unknown as ChunkRow[];
    return rows.map(toChunk);
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
  };
}
