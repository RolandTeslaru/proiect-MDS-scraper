import { randomUUID } from "node:crypto";
import { db } from "./client";
import type { ScrapeRunSummary, SearchResult, StoredScrapeRun } from "./types";

type RunRow = {
  id: string;
  query: string;
  created_at: string;
  video_count: number;
};

type VideoRow = {
  id: string;
  source_url: string;
  position: number;
};

type CommentRow = {
  id: string;
  video_id: string;
  author: string;
  text: string;
  likes: string;
  position: number;
};

const insertRun = db.prepare(`
  INSERT INTO scrape_runs (id, query, created_at, video_count)
  VALUES (@id, @query, @createdAt, @videoCount)
`);

const insertVideo = db.prepare(`
  INSERT INTO scraped_videos (id, scrape_run_id, source_url, position, created_at)
  VALUES (@id, @scrapeRunId, @sourceUrl, @position, @createdAt)
`);

const insertComment = db.prepare(`
  INSERT INTO scraped_comments (id, video_id, author, text, likes, position)
  VALUES (@id, @videoId, @author, @text, @likes, @position)
`);

export function saveScrapeResult(
  query: string,
  result: SearchResult,
): ScrapeRunSummary {
  const runId = randomUUID();
  const createdAt = new Date().toISOString();

  const transaction = db.transaction(() => {
    insertRun.run({
      id: runId,
      query,
      createdAt,
      videoCount: result.videos.length,
    });

    result.videos.forEach((video, videoIndex) => {
      const videoId = randomUUID();
      insertVideo.run({
        id: videoId,
        scrapeRunId: runId,
        sourceUrl: video.url,
        position: videoIndex,
        createdAt,
      });

      video.comments.forEach((comment, commentIndex) => {
        insertComment.run({
          id: randomUUID(),
          videoId,
          author: comment.author,
          text: comment.text,
          likes: comment.likes,
          position: commentIndex,
        });
      });
    });
  });

  transaction();

  return {
    id: runId,
    query,
    createdAt,
    videoCount: result.videos.length,
  };
}

export function listScrapeRuns(limit = 20): ScrapeRunSummary[] {
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const rows = db
    .prepare(
      `
        SELECT id, query, created_at, video_count
        FROM scrape_runs
        ORDER BY datetime(created_at) DESC
        LIMIT ?
      `,
    )
    .all(safeLimit) as RunRow[];

  return rows.map((row) => ({
    id: row.id,
    query: row.query,
    createdAt: row.created_at,
    videoCount: row.video_count,
  }));
}

export function getScrapeRunById(id: string): StoredScrapeRun | null {
  const run = db
    .prepare(
      `
        SELECT id, query, created_at, video_count
        FROM scrape_runs
        WHERE id = ?
      `,
    )
    .get(id) as RunRow | undefined;

  if (!run) {
    return null;
  }

  const videos = db
    .prepare(
      `
        SELECT id, source_url, position
        FROM scraped_videos
        WHERE scrape_run_id = ?
        ORDER BY position ASC
      `,
    )
    .all(id) as VideoRow[];

  const comments = db
    .prepare(
      `
        SELECT id, video_id, author, text, likes, position
        FROM scraped_comments
        WHERE video_id IN (
          SELECT id FROM scraped_videos WHERE scrape_run_id = ?
        )
        ORDER BY position ASC
      `,
    )
    .all(id) as CommentRow[];

  return {
    id: run.id,
    query: run.query,
    createdAt: run.created_at,
    videoCount: run.video_count,
    videos: videos.map((video) => ({
      id: video.id,
      url: video.source_url,
      position: video.position,
      comments: comments
        .filter((comment) => comment.video_id === video.id)
        .map((comment) => ({
          id: comment.id,
          author: comment.author,
          text: comment.text,
          likes: comment.likes,
          position: comment.position,
        })),
    })),
  };
}
