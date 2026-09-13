import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";
import { ensureDirectory } from "../lib/ensure-directory.js";
import { MIGRATIONS } from "./migrations.js";

let instance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (instance) return instance;

  ensureDirectory(dirname(config.databaseFile), "the database");

  instance = new DatabaseSync(config.databaseFile);
  instance.exec("PRAGMA journal_mode = WAL");
  instance.exec("PRAGMA foreign_keys = ON");

  runMigrations(instance);
  logger.info("database ready", { file: config.databaseFile });
  return instance;
}

// Writes that must all land or none of them.
export function withTransaction<T>(work: () => T): T {
  const db = getDb();
  db.exec("BEGIN");
  try {
    const result = work();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

// Each migration runs once. Applied names are tracked in the db itself.
function runMigrations(db: DatabaseSync) {
  db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY)");
  const applied = new Set(
    db.prepare("SELECT name FROM schema_migrations").all().map((row) => String(row.name)),
  );

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.name)) continue;
    db.exec(migration.sql);
    db.prepare("INSERT INTO schema_migrations (name) VALUES (?)").run(migration.name);
    logger.info("migration applied", { name: migration.name });
  }
}
