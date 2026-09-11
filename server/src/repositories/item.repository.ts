import { getDb } from "../db/client.js";
import type { Item, SourceType } from "../domain/item.js";

interface ItemRow {
  id: string;
  source_type: string;
  title: string;
  source_url: string | null;
  content: string;
  created_at: string;
}

export const itemRepository = {
  insert(item: Item): Item {
    getDb()
      .prepare(
        `INSERT INTO items (id, source_type, title, source_url, content, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(item.id, item.sourceType, item.title, item.sourceUrl, item.content, item.createdAt);
    return item;
  },

  listNewestFirst(limit: number, offset: number): Item[] {
    const rows = getDb()
      .prepare(`SELECT * FROM items ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`)
      .all(limit, offset) as unknown as ItemRow[];
    return rows.map(toItem);
  },

  countAll(): number {
    const row = getDb().prepare(`SELECT COUNT(*) AS total FROM items`).get() as { total: number };
    return row.total;
  },

  findById(id: string): Item | null {
    const row = getDb().prepare(`SELECT * FROM items WHERE id = ?`).get(id) as
      | ItemRow
      | undefined;
    return row ? toItem(row) : null;
  },
};

function toItem(row: ItemRow): Item {
  return {
    id: row.id,
    sourceType: row.source_type as SourceType,
    title: row.title,
    sourceUrl: row.source_url,
    content: row.content,
    createdAt: row.created_at,
  };
}
