import Database from "better-sqlite3";

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
  `);
}
