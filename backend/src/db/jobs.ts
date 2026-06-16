import { randomUUID } from "node:crypto";
import { db } from "./client";

export type JobStatus = "pending" | "processing" | "done" | "failed";
export type Verdict = "disinformation" | "authentic" | null;

export interface AnalysisJob {
  id: string;
  sourceUrl: string;
  status: JobStatus;
  createdAt: string;
  verdict: Verdict;
  confidence: number | null;
  processedAt: string | null;
  evidence: string | null;
  reasons: string[] | null;
}

type JobRow = {
  id: string;
  source_url: string;
  status: string;
  created_at: string;
  verdict: string | null;
  confidence: number | null;
  processed_at: string | null;
  evidence: string | null;
  reasons: string | null;
};

function rowToJob(row: JobRow): AnalysisJob {
  return {
    id: row.id,
    sourceUrl: row.source_url,
    status: row.status as JobStatus,
    createdAt: row.created_at,
    verdict: (row.verdict as Verdict) ?? null,
    confidence: row.confidence,
    processedAt: row.processed_at,
    evidence: row.evidence,
    reasons: row.reasons ? JSON.parse(row.reasons) : null,
  };
}

export class AnalysisJobRepository {
  private readonly insertAnalysisJob = db.prepare(`
    INSERT INTO analysis_jobs (id, source_url, status, created_at)
    VALUES (@id, @sourceUrl, @status, @createdAt)
  `);

  private readonly updateJob = db.prepare(`
    UPDATE analysis_jobs
    SET status = @status,
        verdict = @verdict,
        confidence = @confidence,
        processed_at = @processedAt,
        evidence = @evidence,
        reasons = @reasons
    WHERE id = @id
  `);

  createAnalysisJob(sourceUrl: string): string {
    const jobId = randomUUID();
    this.insertAnalysisJob.run({
      id: jobId,
      sourceUrl,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
    return jobId;
  }

  // Create a pending job for a scraped video only if one doesn't already exist
  // for that URL, so re-scraping the same video doesn't pile up duplicates.
  // Returns the job id (existing or new).
  createAnalysisJobIfAbsent(sourceUrl: string): string {
    const existing = db
      .prepare(`SELECT id FROM analysis_jobs WHERE source_url = ? LIMIT 1`)
      .get(sourceUrl) as { id: string } | undefined;
    return existing ? existing.id : this.createAnalysisJob(sourceUrl);
  }

  listPendingJobs(): AnalysisJob[] {
    const rows = db
      .prepare(
        `SELECT id, source_url, status, created_at, verdict, confidence, processed_at, evidence, reasons
         FROM analysis_jobs
         WHERE status = 'pending'
         ORDER BY datetime(created_at) DESC`,
      )
      .all() as JobRow[];
    return rows.map(rowToJob);
  }

  updateJobResult(
    id: string,
    status: JobStatus,
    verdict: Verdict,
    confidence: number | null,
    evidence: string | null,
    reasons: string[] | null,
  ): void {
    this.updateJob.run({
      id,
      status,
      verdict,
      confidence,
      processedAt: new Date().toISOString(),
      evidence,
      reasons: reasons ? JSON.stringify(reasons) : null,
    });
  }

  listJobs(limit = 50): AnalysisJob[] {
    const safeLimit = Math.max(1, Math.min(limit, 200));
    const rows = db
      .prepare(
        `SELECT id, source_url, status, created_at, verdict, confidence, processed_at, evidence, reasons
         FROM analysis_jobs
         ORDER BY datetime(created_at) DESC
         LIMIT ?`,
      )
      .all(safeLimit) as JobRow[];
    return rows.map(rowToJob);
  }

  getJobById(id: string): AnalysisJob | null {
    const row = db
      .prepare(
        `SELECT id, source_url, status, created_at, verdict, confidence, processed_at, evidence, reasons
         FROM analysis_jobs
         WHERE id = ?`,
      )
      .get(id) as JobRow | undefined;
    return row ? rowToJob(row) : null;
  }
}

export const analysisJobRepository = new AnalysisJobRepository();

export function createAnalysisJob(sourceUrl: string) {
  return analysisJobRepository.createAnalysisJob(sourceUrl);
}

export function createAnalysisJobIfAbsent(sourceUrl: string) {
  return analysisJobRepository.createAnalysisJobIfAbsent(sourceUrl);
}

export function listPendingJobs() {
  return analysisJobRepository.listPendingJobs();
}

export function updateJobResult(
  id: string,
  status: JobStatus,
  verdict: Verdict,
  confidence: number | null,
  evidence: string | null,
  reasons: string[] | null,
) {
  return analysisJobRepository.updateJobResult(id, status, verdict, confidence, evidence, reasons);
}

export function listJobs(limit = 50) {
  return analysisJobRepository.listJobs(limit);
}

export function getJobById(id: string) {
  return analysisJobRepository.getJobById(id);
}
