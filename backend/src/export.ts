import type { Response } from "express";
import type { AnalysisJob, StoredScrapeRun } from "./db";

export type ExportFormat = "json" | "csv";

function escapeCsvValue(value: unknown): string {
  const normalized = value == null ? "" : String(value);
  const escaped = normalized.replaceAll('"', '""');
  return `"${escaped}"`;
}

function rowsToCsv(headers: string[], rows: Array<Record<string, unknown>>): string {
  const headerRow = headers.map(escapeCsvValue).join(",");
  const csvRows = rows.map((row) =>
    headers.map((header) => escapeCsvValue(row[header])).join(","),
  );

  return [headerRow, ...csvRows].join("\n");
}

export function parseExportFormat(value: unknown): ExportFormat | null {
  if (value == null || value === "json") {
    return "json";
  }

  if (value === "csv") {
    return "csv";
  }

  return null;
}

export function setDownloadHeaders(
  res: Response,
  fileBaseName: string,
  format: ExportFormat,
) {
  const fileName = `${fileBaseName}.${format}`;

  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.type(format === "csv" ? "text/csv; charset=utf-8" : "application/json");
}

export function serializeJsonDownload(payload: unknown): string {
  return JSON.stringify(payload, null, 2);
}

export function serializeScrapeRunCsv(scrapeRun: StoredScrapeRun): string {
  const headers = [
    "runId",
    "query",
    "createdAt",
    "videoCount",
    "videoId",
    "videoPosition",
    "videoUrl",
    "commentId",
    "commentPosition",
    "commentAuthor",
    "commentText",
    "commentLikes",
  ];

  const rows: Array<Record<string, unknown>> = [];

  if (scrapeRun.videos.length === 0) {
    rows.push({
      runId: scrapeRun.id,
      query: scrapeRun.query,
      createdAt: scrapeRun.createdAt,
      videoCount: scrapeRun.videoCount,
    });
  }

  for (const video of scrapeRun.videos) {
    if (video.comments.length === 0) {
      rows.push({
        runId: scrapeRun.id,
        query: scrapeRun.query,
        createdAt: scrapeRun.createdAt,
        videoCount: scrapeRun.videoCount,
        videoId: video.id,
        videoPosition: video.position,
        videoUrl: video.url,
      });
      continue;
    }

    for (const comment of video.comments) {
      rows.push({
        runId: scrapeRun.id,
        query: scrapeRun.query,
        createdAt: scrapeRun.createdAt,
        videoCount: scrapeRun.videoCount,
        videoId: video.id,
        videoPosition: video.position,
        videoUrl: video.url,
        commentId: comment.id,
        commentPosition: comment.position,
        commentAuthor: comment.author,
        commentText: comment.text,
        commentLikes: comment.likes,
      });
    }
  }

  return rowsToCsv(headers, rows);
}

export function serializeJobsCsv(jobs: AnalysisJob[]): string {
  const headers = [
    "id",
    "sourceUrl",
    "status",
    "createdAt",
    "verdict",
    "confidence",
    "processedAt",
    "evidence",
    "reasons",
  ];

  const rows = jobs.map((job) => ({
    id: job.id,
    sourceUrl: job.sourceUrl,
    status: job.status,
    createdAt: job.createdAt,
    verdict: job.verdict,
    confidence: job.confidence,
    processedAt: job.processedAt,
    evidence: job.evidence,
    reasons: job.reasons?.join(" | ") ?? "",
  }));

  return rowsToCsv(headers, rows);
}
