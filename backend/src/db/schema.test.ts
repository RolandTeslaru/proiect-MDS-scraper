import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import Database from "better-sqlite3";
import { initializeSchema } from "./schema";

test("initializeSchema upgrades older analysis_jobs tables in place", () => {
  const tempDirectory = mkdtempSync(join(tmpdir(), "mds-schema-"));
  const databasePath = join(tempDirectory, "legacy.sqlite");
  let db: Database.Database | undefined;

  try {
    db = new Database(databasePath);
    db.exec(`
      CREATE TABLE analysis_jobs (
        id TEXT PRIMARY KEY,
        source_url TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    initializeSchema(db);

    const columns = db
      .prepare("PRAGMA table_info(analysis_jobs)")
      .all() as Array<{ name: string }>;

    assert.deepEqual(
      columns.map((column) => column.name),
      [
        "id",
        "source_url",
        "status",
        "created_at",
        "verdict",
        "confidence",
        "processed_at",
        "evidence",
        "reasons",
      ],
    );
  } finally {
    db?.close();
    rmSync(tempDirectory, { recursive: true, force: true });
  }
});
