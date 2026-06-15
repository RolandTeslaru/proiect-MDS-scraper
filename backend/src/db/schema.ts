import Database from "better-sqlite3";

function addColumnIfMissing(
  db: Database.Database,
  tableName: string,
  columnName: string,
  columnDefinition: string,
) {
  const columns = db
    .prepare(`PRAGMA table_info(${tableName})`)
    .all() as Array<{ name: string }>;

  if (columns.some((column) => column.name === columnName)) {
    return;
  }

  db.exec(
    `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`,
  );
}

export function initializeSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS scrape_runs (
      id TEXT PRIMARY KEY,
      query TEXT NOT NULL,
      created_at TEXT NOT NULL,
      video_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS scraped_videos (
      id TEXT PRIMARY KEY,
      scrape_run_id TEXT NOT NULL,
      source_url TEXT NOT NULL,
      position INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (scrape_run_id) REFERENCES scrape_runs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS scraped_comments (
      id TEXT PRIMARY KEY,
      video_id TEXT NOT NULL,
      author TEXT NOT NULL,
      text TEXT NOT NULL,
      likes TEXT NOT NULL,
      position INTEGER NOT NULL,
      FOREIGN KEY (video_id) REFERENCES scraped_videos(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS analysis_jobs (
      id TEXT PRIMARY KEY,
      source_url TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      verdict TEXT,
      confidence REAL,
      processed_at TEXT,
      evidence TEXT,
      reasons TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_scrape_runs_created_at
      ON scrape_runs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_scraped_videos_run_id
      ON scraped_videos(scrape_run_id, position);
    CREATE INDEX IF NOT EXISTS idx_scraped_comments_video_id
      ON scraped_comments(video_id, position);
    CREATE INDEX IF NOT EXISTS idx_analysis_jobs_created_at
      ON analysis_jobs(created_at DESC);
  `);

  // Upgrade older local databases in place so new job queries do not fail.
  addColumnIfMissing(db, "analysis_jobs", "verdict", "TEXT");
  addColumnIfMissing(db, "analysis_jobs", "confidence", "REAL");
  addColumnIfMissing(db, "analysis_jobs", "processed_at", "TEXT");
  addColumnIfMissing(db, "analysis_jobs", "evidence", "TEXT");
  addColumnIfMissing(db, "analysis_jobs", "reasons", "TEXT");
}
