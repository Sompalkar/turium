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
];
