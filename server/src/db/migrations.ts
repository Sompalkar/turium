// Add new migrations to the end. Never edit one that already shipped.
export const MIGRATIONS: ReadonlyArray<{ name: string; sql: string }> = [
  {
    name: "001_create_items",
    sql: `
      CREATE TABLE items (
        id          TEXT PRIMARY KEY,
        source_type TEXT NOT NULL CHECK (source_type IN ('note', 'url')),
        title       TEXT NOT NULL,
        source_url  TEXT,
        content     TEXT NOT NULL,
        created_at  TEXT NOT NULL
      );
      CREATE INDEX idx_items_created_at ON items (created_at DESC);
    `,
  },
  {
    name: "002_create_chunks",
    sql: `
      CREATE TABLE chunks (
        id          TEXT PRIMARY KEY,
        item_id     TEXT NOT NULL REFERENCES items (id) ON DELETE CASCADE,
        chunk_index INTEGER NOT NULL,
        content     TEXT NOT NULL,
        char_start  INTEGER NOT NULL,
        char_end    INTEGER NOT NULL,
        UNIQUE (item_id, chunk_index)
      );
      CREATE INDEX idx_chunks_item_id ON chunks (item_id);
    `,
  },
  {
    name: "003_add_chunk_embeddings",
    sql: `
      ALTER TABLE chunks ADD COLUMN embedding BLOB;
      ALTER TABLE chunks ADD COLUMN embedding_model TEXT;
    `,
  },
  {
    name: "004_create_queries",
    sql: `
      CREATE TABLE queries (
        id               TEXT PRIMARY KEY,
        question         TEXT NOT NULL,
        answer           TEXT NOT NULL,
        sources          TEXT NOT NULL,
        model            TEXT NOT NULL,
        input_tokens     INTEGER NOT NULL,
        output_tokens    INTEGER NOT NULL,
        candidate_chunks INTEGER NOT NULL,
        retrieval_ms     INTEGER NOT NULL,
        created_at       TEXT NOT NULL
      );
      CREATE INDEX idx_queries_created_at ON queries (created_at DESC);
    `,
  },
];
