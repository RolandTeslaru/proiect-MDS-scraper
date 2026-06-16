import { randomUUID } from "node:crypto";
import { db } from "./client";
import type {
  ScrapeRunSummary,
  SearchResult,
  StoredComment,
  StoredScrapeRun,
  TikTokVideo,
} from "./types";

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

export class ScrapeRepository {
  private readonly insertRun = db.prepare(`
    INSERT INTO scrape_runs (id, query, created_at, video_count)
    VALUES (@id, @query, @createdAt, @videoCount)
  `);

  private readonly insertVideo = db.prepare(`
    INSERT INTO scraped_videos (id, scrape_run_id, source_url, position, created_at)
    VALUES (@id, @scrapeRunId, @sourceUrl, @position, @createdAt)
  `);

  private readonly insertComment = db.prepare(`
    INSERT INTO scraped_comments (id, video_id, author, text, likes, position)
    VALUES (@id, @videoId, @author, @text, @likes, @position)
  `);

  private readonly runExistsStmt = db.prepare(
    `SELECT 1 FROM scrape_runs WHERE id = ?`,
  );

  // Remove any existing video for this run+url so re-saving the same video
  // (e.g. after the agent retries) overwrites instead of duplicating. The
  // FK cascade deletes that video's comments too.
  private readonly deleteVideoByRunAndUrl = db.prepare(
    `DELETE FROM scraped_videos WHERE scrape_run_id = ? AND source_url = ?`,
  );

  private readonly countVideosInRun = db.prepare(
    `SELECT COUNT(*) AS count FROM scraped_videos WHERE scrape_run_id = ?`,
  );

  private readonly updateVideoCount = db.prepare(
    `UPDATE scrape_runs
       SET video_count = (
         SELECT COUNT(*) FROM scraped_videos WHERE scrape_run_id = @runId
       )
     WHERE id = @runId`,
  );

  saveScrapeResult(query: string, result: SearchResult): ScrapeRunSummary {
    const runId = randomUUID();
    const createdAt = new Date().toISOString();

    const transaction = db.transaction(() => {
      this.insertRun.run({
        id: runId,
        query,
        createdAt,
        videoCount: result.videos.length,
      });

      result.videos.forEach((video, videoIndex) => {
        const videoId = randomUUID();
        this.insertVideo.run({
          id: videoId,
          scrapeRunId: runId,
          sourceUrl: video.url,
          position: videoIndex,
          createdAt,
        });

        video.comments.forEach((comment, commentIndex) => {
          this.insertComment.run({
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

  /** Create an empty run up front; videos are added incrementally afterwards. */
  createRun(query: string): ScrapeRunSummary {
    const runId = randomUUID();
    const createdAt = new Date().toISOString();
    this.insertRun.run({ id: runId, query, createdAt, videoCount: 0 });
    return { id: runId, query, createdAt, videoCount: 0 };
  }

  runExists(runId: string): boolean {
    return this.runExistsStmt.get(runId) !== undefined;
  }

  /**
   * Save one video and its comments into an existing run. Idempotent per
   * (runId, url): re-saving the same video replaces the previous version
   * instead of creating duplicates. Returns the new video count for the run.
   */
  addVideoWithComments(
    runId: string,
    video: TikTokVideo,
  ): { videoId: string; savedComments: number; videoCount: number } {
    const videoId = randomUUID();
    const createdAt = new Date().toISOString();

    const transaction = db.transaction(() => {
      this.deleteVideoByRunAndUrl.run(runId, video.url);

      const { count } = this.countVideosInRun.get(runId) as { count: number };
      this.insertVideo.run({
        id: videoId,
        scrapeRunId: runId,
        sourceUrl: video.url,
        position: count,
        createdAt,
      });

      video.comments.forEach((comment, commentIndex) => {
        this.insertComment.run({
          id: randomUUID(),
          videoId,
          author: comment.author,
          text: comment.text,
          likes: comment.likes,
          position: commentIndex,
        });
      });

      this.updateVideoCount.run({ runId });
    });

    transaction();

    const { count } = this.countVideosInRun.get(runId) as { count: number };
    return {
      videoId,
      savedComments: video.comments.length,
      videoCount: count,
    };
  }

  listScrapeRuns(limit = 20): ScrapeRunSummary[] {
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

  getScrapeRunById(id: string): StoredScrapeRun | null {
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

  /**
   * Returns the scraped comments for a given video URL, taken from the most
   * recent scrape of that URL. Jobs and scrapes are linked only by source URL,
   * so this lets a job detail page show the comments the agent analyzed.
   */
  getCommentsBySourceUrl(sourceUrl: string): StoredComment[] {
    const rows = db
      .prepare(
        `
          SELECT id, author, text, likes, position
          FROM scraped_comments
          WHERE video_id = (
            SELECT id FROM scraped_videos
            WHERE source_url = ?
            ORDER BY datetime(created_at) DESC
            LIMIT 1
          )
          ORDER BY position ASC
        `,
      )
      .all(sourceUrl) as CommentRow[];

    return rows.map((row) => ({
      id: row.id,
      author: row.author,
      text: row.text,
      likes: row.likes,
      position: row.position,
    }));
  }
}

export const scrapeRepository = new ScrapeRepository();

export function saveScrapeResult(query: string, result: SearchResult) {
  return scrapeRepository.saveScrapeResult(query, result);
}

export function createRun(query: string) {
  return scrapeRepository.createRun(query);
}

export function runExists(runId: string) {
  return scrapeRepository.runExists(runId);
}

export function addVideoWithComments(runId: string, video: TikTokVideo) {
  return scrapeRepository.addVideoWithComments(runId, video);
}

export function listScrapeRuns(limit = 20) {
  return scrapeRepository.listScrapeRuns(limit);
}

export function getScrapeRunById(id: string) {
  return scrapeRepository.getScrapeRunById(id);
}

export function getCommentsBySourceUrl(sourceUrl: string) {
  return scrapeRepository.getCommentsBySourceUrl(sourceUrl);
}
